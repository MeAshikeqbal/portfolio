import "server-only"

import type { Env, Fetch } from "./http"
import { getJellyfinActivity } from "./jellyfin"
import { getSpotifyActivity } from "./spotify"
import { getTraktActivity } from "./trakt"
import type { LiveActivity } from "./types"

/**
 * All live activity, each integration independently: one failing or unconfigured upstream
 * just comes back null. The fetchers only ever return allowlisted fields.
 */
export async function getLiveActivity(
  env: Env = process.env,
  fetchImpl: Fetch = fetch,
): Promise<LiveActivity> {
  const [spotify, trakt, jellyfin] = await Promise.all([
    getSpotifyActivity(env, fetchImpl),
    getTraktActivity(env, fetchImpl),
    getJellyfinActivity(env, fetchImpl),
  ])
  return { spotify, trakt, jellyfin }
}
