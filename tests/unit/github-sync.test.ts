// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  hasFreshSyncRequest,
  MAX_SYNC_IDS,
  parseSyncIds,
  SYNC_REQUEST_TTL_MS,
} from "@/lib/github-sync-request"

/** Records every patch the code under test commits. */
const patches: { id: string; ops: Record<string, unknown> }[] = []
const fetchQuery = vi.fn()
const fetchGitHubData = vi.fn()

function patchBuilder(id: string) {
  const ops: Record<string, unknown> = {}
  const builder = {
    unset: (fields: string[]) => ((ops.unset = fields), builder),
    setIfMissing: (value: unknown) => ((ops.setIfMissing = value), builder),
    set: (value: unknown) => ((ops.set = value), builder),
    commit: async () => {
      patches.push({ id, ops })
      return {}
    },
  }
  return builder
}

vi.mock("@/sanity/lib/write-client", () => ({
  writeClient: {
    patch: (id: string) => patchBuilder(id),
    fetch: (...args: unknown[]) => fetchQuery(...args),
  },
}))
vi.mock("@/lib/fetch-github-data", () => ({
  fetchGitHubData: (...args: unknown[]) => fetchGitHubData(...args),
  githubPatchFields: (data: { stars: number }) => ({ "githubData.stars": data.stars }),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const { syncProjects } = await import("@/lib/github-sync")
const { POST } = await import("@/app/api/github-sync/route")

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/github-sync", {
      method: "POST",
      body: JSON.stringify(body),
    }) as never,
  )

beforeEach(() => {
  patches.length = 0
  fetchQuery.mockReset()
  fetchGitHubData.mockReset()
})

describe("hasFreshSyncRequest", () => {
  const now = Date.parse("2026-11-09T12:00:00Z")
  const at = (offset: number) => ({
    _id: "p",
    githubSyncRequestedAt: new Date(now + offset).toISOString(),
  })

  it("accepts a request from the last few minutes", () => {
    expect(hasFreshSyncRequest(at(-30_000), now)).toBe(true)
    expect(hasFreshSyncRequest(at(30_000), now)).toBe(true) // small clock skew
  })

  it("rejects missing, stale, far-future and malformed stamps", () => {
    expect(hasFreshSyncRequest({ _id: "p" }, now)).toBe(false)
    expect(hasFreshSyncRequest(at(-SYNC_REQUEST_TTL_MS - 1), now)).toBe(false)
    expect(hasFreshSyncRequest(at(10 * 60_000), now)).toBe(false)
    expect(hasFreshSyncRequest({ _id: "p", githubSyncRequestedAt: "soon" }, now)).toBe(false)
  })
})

describe("parseSyncIds", () => {
  it("accepts document ids, including drafts, and de-duplicates", () => {
    expect(parseSyncIds({ ids: ["abc", "drafts.abc", "abc"] })).toEqual(["abc", "drafts.abc"])
  })

  it.each([
    null,
    {},
    { ids: [] },
    { ids: "abc" },
    { ids: [1] },
    { ids: ["*[_type == 'x']"] },
    { ids: Array.from({ length: MAX_SYNC_IDS + 1 }, (_, i) => `p${i}`) },
  ])("rejects %j", (body) => {
    expect(parseSyncIds(body)).toBeNull()
  })
})

describe("syncProjects", () => {
  it("fetches each repo once, stamps syncedAt and clears the request", async () => {
    fetchGitHubData.mockResolvedValue({ stars: 7, activity: null })
    const results = await syncProjects([
      { _id: "p1", title: "One", github: "https://github.com/a/one" },
      { _id: "drafts.p1", title: "One", github: "https://github.com/a/one" },
    ])
    expect(fetchGitHubData).toHaveBeenCalledTimes(1)
    expect(results.map((r) => r.ok)).toEqual([true, true])
    expect(patches[0].id).toBe("p1")
    expect(patches[0].ops.unset).toEqual(["githubSyncRequestedAt"])
    expect(patches[0].ops.set).toMatchObject({ "githubData.stars": 7 })
    expect(patches[0].ops.set).toHaveProperty("githubData.syncedAt")
  })

  it("clears the request even when GitHub has no data", async () => {
    fetchGitHubData.mockResolvedValue(null)
    const [result] = await syncProjects([{ _id: "p1", github: "https://github.com/a/one" }])
    expect(result.ok).toBe(false)
    expect(patches).toEqual([{ id: "p1", ops: { unset: ["githubSyncRequestedAt"] } }])
  })
})

describe("POST /api/github-sync", () => {
  it("rejects a malformed body", async () => {
    expect((await post({ nope: true })).status).toBe(400)
    expect(fetchQuery).not.toHaveBeenCalled()
  })

  it("only syncs projects with a fresh request from the Studio", async () => {
    fetchGitHubData.mockResolvedValue({ stars: 1, activity: { commits: 3, weeklyCommits: [] } })
    fetchQuery.mockResolvedValue([
      {
        _id: "fresh",
        title: "Fresh",
        github: "https://github.com/a/fresh",
        githubSyncRequestedAt: new Date().toISOString(),
      },
      { _id: "unrequested", title: "Unrequested", github: "https://github.com/a/b" },
    ])
    const response = await post({ ids: ["fresh", "unrequested", "missing"] })
    expect(await response.json()).toEqual({ synced: ["fresh"], failed: [], skipped: 2 })
    expect(patches.map((p) => p.id)).toEqual(["fresh"])
  })
})
