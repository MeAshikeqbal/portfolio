import "server-only"

import type { SpotifyActivity } from "./types"
import { getJson, isoDate, num, safeUrl, str, type Env, type Fetch } from "./http"
import { NO_TIMING, timing, type Timing } from "./progress"

const TOKEN_URL = "https://accounts.spotify.com/api/token"
const API = "https://api.spotify.com/v1/me/player"

interface SpotifyTrack {
  name?: unknown
  artists?: { name?: unknown }[]
  album?: { images?: { url?: unknown; width?: unknown }[] }
  external_urls?: { spotify?: unknown }
  duration_ms?: unknown
}

let cachedToken: { value: string; expiresAt: number } | null = null

/** For tests: forget the cached access token. */
export function resetSpotifyTokenCache() {
  cachedToken = null
}

async function accessToken(env: Env, fetchImpl: Fetch): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value
  const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = env
  const result = await getJson<{ access_token?: unknown; expires_in?: unknown }>(
    fetchImpl,
    TOKEN_URL,
    {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: env.SPOTIFY_REFRESH_TOKEN ?? "",
      }),
    },
  )
  const token = str(result?.data?.access_token)
  if (!token) return null
  // Refresh a minute early so a request never goes out with a token about to expire.
  const ttl = (num(result?.data?.expires_in) ?? 3600) - 60
  cachedToken = { value: token, expiresAt: Date.now() + ttl * 1000 }
  return token
}

/** Smallest album image that's still at least 64px wide (Spotify lists them largest first). */
function albumArt(track: SpotifyTrack): string | null {
  const images = (track.album?.images ?? []).filter((image) => str(image.url))
  const small = [...images].reverse().find((image) => (num(image.width) ?? 0) >= 64)
  return safeUrl((small ?? images.at(-1))?.url, ["i.scdn.co"])
}

export function toSpotifyActivity(
  track: SpotifyTrack | null | undefined,
  state: SpotifyActivity["state"],
  at: string | null,
  playback: Timing = NO_TIMING,
): SpotifyActivity | null {
  const name = str(track?.name)
  if (!track || !name) return null
  const artists = (track.artists ?? []).map((artist) => str(artist.name)).filter(Boolean)
  return {
    state,
    track: name,
    artists: artists.join(", "),
    url: safeUrl(track.external_urls?.spotify, ["open.spotify.com"]),
    art: albumArt(track),
    at: state === "playing" ? null : at,
    ...(state === "playing" ? playback : NO_TIMING),
  }
}

/**
 * When the current track started and will end, from how far in it is right now. Measured
 * against the server's clock at fetch time; a pause or seek shows up on the next poll.
 */
export function spotifyTiming(progressMs: unknown, durationMs: unknown, nowMs: number): Timing {
  const progress = num(progressMs)
  const duration = num(durationMs)
  if (progress === null || duration === null || progress < 0 || progress > duration) {
    return NO_TIMING
  }
  const start = nowMs - progress
  return timing(start, start + duration)
}

/**
 * What's playing on Spotify, falling back to the last played track. Null when unconfigured or
 * when Spotify can't be reached.
 */
export async function getSpotifyActivity(
  env: Env = process.env,
  fetchImpl: Fetch = fetch,
): Promise<SpotifyActivity | null> {
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET || !env.SPOTIFY_REFRESH_TOKEN) {
    return null
  }
  const token = await accessToken(env, fetchImpl)
  if (!token) return null
  const headers = { authorization: `Bearer ${token}` }

  const current = await getJson<{
    is_playing?: unknown
    timestamp?: unknown
    progress_ms?: unknown
    currently_playing_type?: unknown
    item?: SpotifyTrack | null
  }>(fetchImpl, `${API}/currently-playing`, { headers })
  if (current?.data?.item && current.data.currently_playing_type === "track") {
    const playing = current.data.is_playing === true
    const activity = toSpotifyActivity(
      current.data.item,
      playing ? "playing" : "last",
      isoDate(current.data.timestamp),
      playing
        ? spotifyTiming(current.data.progress_ms, current.data.item.duration_ms, Date.now())
        : NO_TIMING,
    )
    if (activity) return activity
  }

  const recent = await getJson<{ items?: { track?: SpotifyTrack; played_at?: unknown }[] }>(
    fetchImpl,
    `${API}/recently-played?limit=1`,
    { headers },
  )
  const last = recent?.data?.items?.[0]
  return toSpotifyActivity(last?.track, "last", isoDate(last?.played_at))
}
