import "server-only"

import type { JellyfinActivity } from "./types"
import { getJson, type Env, type Fetch } from "./http"

interface JellyfinSession {
  NowPlayingItem?: unknown
  PlayState?: { PlayMethod?: unknown }
}

/** Counts playing sessions by play method. Reads nothing else from a session. */
export function countStreams(sessions: unknown, checkedAt: string): JellyfinActivity | null {
  if (!Array.isArray(sessions)) return null
  const playing = (sessions as JellyfinSession[]).filter(
    (session) => session && typeof session === "object" && session.NowPlayingItem,
  )
  const transcode = playing.filter((s) => s.PlayState?.PlayMethod === "Transcode").length
  return { streams: playing.length, direct: playing.length - transcode, transcode, checkedAt }
}

/**
 * How many people are streaming from the Jellyfin server right now: counts only. Null when
 * unconfigured or unreachable. The server URL and key never leave this module.
 */
export async function getJellyfinActivity(
  env: Env = process.env,
  fetchImpl: Fetch = fetch,
  now: () => Date = () => new Date(),
): Promise<JellyfinActivity | null> {
  const { JELLYFIN_URL: base, JELLYFIN_API_KEY: key } = env
  if (!base || !key) return null
  let url: URL
  try {
    url = new URL("Sessions", base.endsWith("/") ? base : `${base}/`)
  } catch {
    return null
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null
  url.searchParams.set("activeWithinSeconds", "960")

  const result = await getJson<unknown>(fetchImpl, url.toString(), {
    headers: { authorization: `MediaBrowser Token="${key}"` },
  })
  return result?.data ? countStreams(result.data, now().toISOString()) : null
}
