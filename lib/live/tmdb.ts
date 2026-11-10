import "server-only"

import { getJson, type Env, type Fetch } from "./http"

const API = "https://api.themoviedb.org/3"
/** 154px wide: crisp at the panel's 40px (and 2x/3x screens), small to fetch. */
const IMAGE = "https://image.tmdb.org/t/p/w154"
/** A TMDB image path: "/abc123.jpg". Anything else is ignored, never passed through. */
const POSTER_PATH = /^\/[A-Za-z0-9]+\.(jpg|jpeg|png|webp)$/
const DAY_MS = 86_400_000
const MAX_ENTRIES = 100

/**
 * Posters per title, kept a day per server instance: the live endpoint is asked every 30s
 * (CDN-cached), and a title's poster almost never changes, so TMDB is asked about once a
 * day per title. Misses are cached too, so a title without a poster isn't retried each time.
 */
const cache = new Map<string, { poster: string | null; until: number }>()

/** For tests. */
export function clearPosterCache() {
  cache.clear()
}

/**
 * The poster for a movie or TV show by its TMDB id, as an image.tmdb.org URL, or null when
 * unconfigured, unknown or unreachable. Works with either kind of TMDB credential: the v4
 * "API Read Access Token" (a JWT, sent as a bearer token) or the v3 "API Key" (a query param).
 */
export async function getTmdbPoster(
  kind: "movie" | "tv",
  id: number,
  env: Env = process.env,
  fetchImpl: Fetch = fetch,
  now: number = Date.now(),
): Promise<string | null> {
  const key = env.TMDB_API_KEY?.trim()
  if (!key || !Number.isInteger(id) || id <= 0) return null

  const cacheKey = `${kind}:${id}`
  const hit = cache.get(cacheKey)
  if (hit && hit.until > now) return hit.poster

  const url = new URL(`${API}/${kind}/${id}`)
  const bearer = key.startsWith("eyJ")
  if (!bearer) url.searchParams.set("api_key", key)
  const result = await getJson<{ poster_path?: unknown }>(fetchImpl, url.toString(), {
    headers: bearer ? { authorization: `Bearer ${key}` } : {},
  })
  // Only real answers are cached: a network failure or a bad key (401) is retried next time.
  if (!result || (result.status !== 200 && result.status !== 404)) return null
  const path = result.data?.poster_path
  const poster = typeof path === "string" && POSTER_PATH.test(path) ? `${IMAGE}${path}` : null

  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value!)
  cache.set(cacheKey, { poster, until: now + DAY_MS })
  return poster
}
