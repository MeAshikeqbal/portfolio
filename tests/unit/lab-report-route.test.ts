import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { monthDays } from "@/lib/lab/report"

const scheduled: (() => unknown)[] = []
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => unknown) => scheduled.push(task),
}))
const fetchQuery = vi.fn()
const createIfNotExists = vi.fn(async (doc: { _id: string }) => doc)
vi.mock("@/sanity/lib/write-client", () => ({
  writeClient: {
    fetch: (...args: unknown[]) => fetchQuery(...args),
    createIfNotExists: (doc: { _id: string }) => createIfNotExists(doc),
  },
}))
const readLabDays = vi.fn()
vi.mock("@/lib/lab/store", () => ({ readLabDays: (days: string[]) => readLabDays(days) }))
const sendPush = vi.fn(async () => true)
vi.mock("@/lib/lab/alerts", () => ({ sendPush: (...args: unknown[]) => sendPush(...(args as [])) }))

const { GET } = await import("@/app/api/lab-report/route")

const call = (query = "", secret = "s") =>
  GET(
    new NextRequest(`http://localhost/api/lab-report${query}`, {
      headers: { authorization: `Bearer ${secret}` },
    }),
  )

const fullDay = { "node:Tower:n": "288", "node:Tower:u": "288" }
const sanity = { changes: [], writeups: [], author: "author-1", category: "cat-1", existing: null }

describe("GET /api/lab-report", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "s")
    vi.useFakeTimers({ now: new Date("2026-12-01T06:00:00Z"), toFake: ["Date"] })
    scheduled.length = 0
    fetchQuery.mockReset().mockResolvedValue(sanity)
    createIfNotExists.mockClear()
    sendPush.mockClear()
    readLabDays.mockReset().mockImplementation(async (days: string[]) => ({
      states: {},
      events: [],
      rollups: days.map(() => fullDay),
    }))
  })

  it("rejects calls without the cron secret", async () => {
    expect((await call("", "nope")).status).toBe(401)
    expect(readLabDays).not.toHaveBeenCalled()
  })

  it("drafts last month's report, filed under Homelab, then sends a push", async () => {
    const response = await call()
    expect(response.status).toBe(201)
    expect(readLabDays).toHaveBeenCalledWith(monthDays("2026-11"))
    expect(fetchQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ from: "2026-11-01", to: "2026-11-30", id: "lab-report-2026-11" }),
      { perspective: "raw" },
    )
    const doc = createIfNotExists.mock.calls[0][0] as Record<string, unknown>
    expect(doc).toMatchObject({
      _id: "drafts.lab-report-2026-11",
      _type: "post",
      title: "Lab report: November 2026",
      slug: { _type: "slug", current: "lab-report-2026-11" },
      author: { _type: "reference", _ref: "author-1" },
      categories: [{ _type: "reference", _ref: "cat-1", _key: "homelab" }],
    })
    expect(doc).not.toHaveProperty("publishedAt")
    await scheduled[0]()
    expect(sendPush).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Lab report: November 2026 is drafted",
        click: "https://www.itsashik.dev/studio/intent/edit/id=lab-report-2026-11;type=post/",
      }),
    )
  })

  it("leaves an existing report alone", async () => {
    fetchQuery.mockResolvedValue({ ...sanity, existing: "drafts.lab-report-2026-11" })
    const body = await (await call()).json()
    expect(body.message).toBe("Already drafted")
    expect(createIfNotExists).not.toHaveBeenCalled()
  })

  it("writes nothing on a dry run, or when nothing was recorded", async () => {
    const dry = await (await call("?dry=1&month=2026-10")).json()
    expect(dry.doc.title).toBe("Lab report: October 2026")
    readLabDays.mockResolvedValue({ states: {}, events: [], rollups: [] })
    expect((await (await call()).json()).id).toBeNull()
    expect(createIfNotExists).not.toHaveBeenCalled()
  })

  it("refuses malformed or unfinished months, and an unconfigured store", async () => {
    expect((await call("?month=2026-13")).status).toBe(400)
    expect((await call("?month=2026-12")).status).toBe(400)
    readLabDays.mockResolvedValue(null)
    expect((await call()).status).toBe(503)
  })
})
