import { describe, expect, it } from "vitest"
import { getJellyfinActivity } from "@/lib/live/jellyfin"
import { empty, fakeFetch, json, malformed } from "./live-fixtures"

const env = { JELLYFIN_URL: "https://media.example.org/jf", JELLYFIN_API_KEY: "key" }
const SESSIONS = "GET media.example.org/jf/Sessions"
const now = () => new Date("2026-11-09T12:00:00Z")

const session = (method: string | null, playing = true) => ({
  UserName: "someone",
  DeviceName: "Living room TV",
  ...(playing ? { NowPlayingItem: { Name: "A Title" } } : {}),
  PlayState: method ? { PlayMethod: method } : {},
})

describe("getJellyfinActivity", () => {
  it("counts playing sessions by play method and ignores idle ones", async () => {
    const { impl, calls } = fakeFetch({
      [SESSIONS]: () =>
        json([
          session("DirectPlay"),
          session("DirectStream"),
          session("Transcode"),
          session(null, false),
        ]),
    })
    expect(await getJellyfinActivity(env, impl, now)).toEqual({
      streams: 3,
      direct: 2,
      transcode: 1,
      checkedAt: "2026-11-09T12:00:00.000Z",
    })
    expect(calls[0].url).toContain("activeWithinSeconds=960")
    expect(calls[0].init?.headers).toMatchObject({ authorization: 'MediaBrowser Token="key"' })
  })

  it("reports zero streams when nobody is watching", async () => {
    const { impl } = fakeFetch({ [SESSIONS]: () => json([session(null, false)]) })
    expect(await getJellyfinActivity(env, impl, now)).toMatchObject({ streams: 0 })
  })

  it.each([
    ["a 401", () => empty(401)],
    ["a 500", () => empty(500)],
    ["malformed JSON", malformed],
    ["a non-array body", () => json({ sessions: [] })],
    ["a timeout", () => "timeout" as const],
  ])("is null after %s", async (_, handler) => {
    const { impl } = fakeFetch({ [SESSIONS]: handler })
    expect(await getJellyfinActivity(env, impl, now)).toBeNull()
  })

  it("makes no request when unconfigured or misconfigured", async () => {
    const { impl, calls } = fakeFetch({})
    expect(await getJellyfinActivity({ JELLYFIN_URL: env.JELLYFIN_URL }, impl)).toBeNull()
    expect(await getJellyfinActivity({ ...env, JELLYFIN_URL: "not a url" }, impl)).toBeNull()
    expect(await getJellyfinActivity({ ...env, JELLYFIN_URL: "ftp://x.example" }, impl)).toBeNull()
    expect(calls).toHaveLength(0)
  })
})
