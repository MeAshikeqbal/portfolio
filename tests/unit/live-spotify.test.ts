import { beforeEach, describe, expect, it } from "vitest"
import { getSpotifyActivity, resetSpotifyTokenCache } from "@/lib/live/spotify"
import { empty, fakeFetch, json, malformed, spotifyTrack } from "./live-fixtures"

type Routes = Parameters<typeof fakeFetch>[0]

const env = {
  SPOTIFY_CLIENT_ID: "id",
  SPOTIFY_CLIENT_SECRET: "secret",
  SPOTIFY_REFRESH_TOKEN: "refresh",
}
const token = () => json({ access_token: "access", expires_in: 3600 })
const TOKEN = "POST accounts.spotify.com/api/token"
const CURRENT = "GET api.spotify.com/v1/me/player/currently-playing"
const RECENT = "GET api.spotify.com/v1/me/player/recently-played"

describe("getSpotifyActivity", () => {
  beforeEach(() => resetSpotifyTokenCache())

  it("returns the playing track with small art and a Spotify link", async () => {
    const { impl, calls } = fakeFetch({
      [TOKEN]: token,
      [CURRENT]: () =>
        json({ is_playing: true, currently_playing_type: "track", item: spotifyTrack("Song") }),
    })
    expect(await getSpotifyActivity(env, impl)).toEqual({
      state: "playing",
      track: "Song",
      artists: "Artist A, Artist B",
      url: "https://open.spotify.com/track/song",
      art: "https://i.scdn.co/image/64",
      at: null,
    })
    expect(calls[1].init?.headers).toMatchObject({ authorization: "Bearer access" })
  })

  it("falls back to the last played track when nothing is playing", async () => {
    const { impl } = fakeFetch({
      [TOKEN]: token,
      [CURRENT]: () => empty(204),
      [RECENT]: () =>
        json({ items: [{ track: spotifyTrack("Old"), played_at: "2026-11-09T10:00:00Z" }] }),
    })
    expect(await getSpotifyActivity(env, impl)).toMatchObject({
      state: "last",
      track: "Old",
      at: "2026-11-09T10:00:00.000Z",
    })
  })

  it("treats a paused track as the last one played", async () => {
    const { impl } = fakeFetch({
      [TOKEN]: token,
      [CURRENT]: () =>
        json({
          is_playing: false,
          timestamp: Date.parse("2026-11-09T09:00:00Z"),
          currently_playing_type: "track",
          item: spotifyTrack("Paused"),
        }),
    })
    expect(await getSpotifyActivity(env, impl)).toMatchObject({
      state: "last",
      track: "Paused",
      at: "2026-11-09T09:00:00.000Z",
    })
  })

  it("is null with an empty history", async () => {
    const { impl } = fakeFetch({
      [TOKEN]: token,
      [CURRENT]: () => empty(204),
      [RECENT]: () => json({ items: [] }),
    })
    expect(await getSpotifyActivity(env, impl)).toBeNull()
  })

  it.each<[string, Routes]>([
    ["a rejected refresh token", { [TOKEN]: () => json({ error: "invalid_grant" }, 400) }],
    [
      "a 401 from the player",
      { [TOKEN]: token, [CURRENT]: () => empty(401), [RECENT]: () => empty(401) },
    ],
    ["a 500", { [TOKEN]: token, [CURRENT]: () => empty(500), [RECENT]: () => empty(500) }],
    ["malformed JSON", { [TOKEN]: token, [CURRENT]: malformed, [RECENT]: malformed }],
    ["a timeout", { [TOKEN]: () => "timeout" as const }],
    [
      "a network error",
      { [TOKEN]: token, [CURRENT]: () => "network" as const, [RECENT]: () => "network" as const },
    ],
  ])("is null after %s", async (_, routes) => {
    const { impl } = fakeFetch(routes)
    expect(await getSpotifyActivity(env, impl)).toBeNull()
  })

  it("drops art and links on unexpected hosts", async () => {
    const track = {
      ...spotifyTrack("Song"),
      album: { images: [{ url: "https://evil.example/art.jpg", width: 64 }] },
      external_urls: { spotify: "javascript:alert(1)" },
    }
    const { impl } = fakeFetch({
      [TOKEN]: token,
      [CURRENT]: () => json({ is_playing: true, currently_playing_type: "track", item: track }),
    })
    expect(await getSpotifyActivity(env, impl)).toMatchObject({ art: null, url: null })
  })

  it("makes no request when unconfigured, and reuses the access token", async () => {
    const { impl, calls } = fakeFetch({
      [TOKEN]: token,
      [CURRENT]: () => empty(204),
      [RECENT]: () => json({ items: [] }),
    })
    expect(await getSpotifyActivity({}, impl)).toBeNull()
    expect(calls).toHaveLength(0)
    await getSpotifyActivity(env, impl)
    await getSpotifyActivity(env, impl)
    expect(calls.filter((call) => call.url.includes("accounts.spotify.com"))).toHaveLength(1)
  })
})
