import { beforeEach, describe, expect, it } from "vitest"
import { getLiveActivity } from "@/lib/live"
import { resetSpotifyTokenCache } from "@/lib/live/spotify"
import { empty, fakeFetch, json, spotifyTrack } from "./live-fixtures"

// Sentinels that must never reach the public response.
const SECRETS = {
  host: "sentinel-host.example",
  jellyfinKey: "SENTINEL_JF_KEY",
  spotifySecret: "SENTINEL_SP_SECRET",
  refresh: "SENTINEL_REFRESH",
  access: "SENTINEL_ACCESS",
  traktClient: "SENTINEL_TRAKT_CLIENT",
  traktUser: "sentinel-trakt-user",
  viewer: "SENTINEL_VIEWER",
  device: "SENTINEL_DEVICE",
  client: "SENTINEL_CLIENT_APP",
  title: "SENTINEL_TITLE_WATCHED_BY_SOMEONE_ELSE",
  ip: "203.0.113.77",
}

const env = {
  JELLYFIN_URL: `https://${SECRETS.host}/`,
  JELLYFIN_API_KEY: SECRETS.jellyfinKey,
  SPOTIFY_CLIENT_ID: "id",
  SPOTIFY_CLIENT_SECRET: SECRETS.spotifySecret,
  SPOTIFY_REFRESH_TOKEN: SECRETS.refresh,
  TRAKT_CLIENT_ID: SECRETS.traktClient,
  TRAKT_USERNAME: SECRETS.traktUser,
}

describe("getLiveActivity", () => {
  beforeEach(() => resetSpotifyTokenCache())

  it("never exposes hosts, keys, users, devices or other people's titles", async () => {
    const { impl } = fakeFetch({
      [`GET ${SECRETS.host}/Sessions`]: () =>
        json([
          {
            UserName: SECRETS.viewer,
            DeviceName: SECRETS.device,
            Client: SECRETS.client,
            RemoteEndPoint: SECRETS.ip,
            NowPlayingItem: { Name: SECRETS.title },
            PlayState: { PlayMethod: "Transcode" },
          },
        ]),
      "POST accounts.spotify.com": () => json({ access_token: SECRETS.access, expires_in: 3600 }),
      "GET api.spotify.com": () =>
        json({ is_playing: true, currently_playing_type: "track", item: spotifyTrack("Song") }),
      "GET api.trakt.tv": () => empty(204),
    })
    const activity = await getLiveActivity(env, impl)
    const body = JSON.stringify(activity)
    for (const secret of Object.values(SECRETS)) expect(body).not.toContain(secret)
    expect(activity.jellyfin).toMatchObject({ streams: 1, transcode: 1 })
    expect(Object.keys(activity.jellyfin!).sort()).toEqual(
      ["checkedAt", "direct", "streams", "transcode"].sort(),
    )
    expect(activity.spotify?.track).toBe("Song")
  })

  it("keeps the other integrations when one fails", async () => {
    const { impl } = fakeFetch({
      [`GET ${SECRETS.host}/Sessions`]: () => "network" as const,
      "POST accounts.spotify.com": () => json({ access_token: "a", expires_in: 3600 }),
      "GET api.spotify.com": () =>
        json({ is_playing: true, currently_playing_type: "track", item: spotifyTrack("Song") }),
      "GET api.trakt.tv": () => empty(500),
    })
    const activity = await getLiveActivity(env, impl)
    expect(activity.jellyfin).toBeNull()
    expect(activity.trakt).toBeNull()
    expect(activity.spotify?.state).toBe("playing")
  })

  it("is all null with nothing configured", async () => {
    const { impl, calls } = fakeFetch({})
    expect(await getLiveActivity({}, impl)).toEqual({ spotify: null, trakt: null, jellyfin: null })
    expect(calls).toHaveLength(0)
  })
})
