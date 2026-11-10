import "server-only"

import type { TraktActivity } from "./types"
import { getJson, isoDate, num, str, type Env, type Fetch } from "./http"
import { NO_TIMING, timing, type Timing } from "./progress"
import { getTmdbPoster } from "./tmdb"

const API = "https://api.trakt.tv"

interface TraktIds {
  slug?: unknown
  tmdb?: unknown
}
interface TraktEntry {
  type?: unknown
  watched_at?: unknown
  /** /watching only: when the check-in or scrobble started and when Trakt expects it to end. */
  started_at?: unknown
  expires_at?: unknown
  movie?: { title?: unknown; year?: unknown; ids?: TraktIds }
  show?: { title?: unknown; year?: unknown; ids?: TraktIds }
  episode?: { title?: unknown; season?: unknown; number?: unknown }
}

const slug = (ids: TraktIds | undefined) => {
  const value = str(ids?.slug)
  return value && /^[a-z0-9-]+$/.test(value) ? value : null
}

export function toTraktActivity(
  entry: TraktEntry | null | undefined,
  state: TraktActivity["state"],
): TraktActivity | null {
  if (!entry) return null
  const at = state === "last" ? isoDate(entry.watched_at) : null
  const playback: Timing = state === "watching" ? traktTiming(entry) : NO_TIMING

  if (entry.type === "movie") {
    const title = str(entry.movie?.title)
    if (!title) return null
    const movieSlug = slug(entry.movie?.ids)
    return {
      state,
      kind: "movie",
      title,
      show: null,
      season: null,
      episode: null,
      year: num(entry.movie?.year),
      url: movieSlug ? `https://trakt.tv/movies/${movieSlug}` : null,
      poster: null,
      at,
      ...playback,
    }
  }

  if (entry.type === "episode") {
    const show = str(entry.show?.title)
    if (!show) return null
    const season = num(entry.episode?.season)
    const episode = num(entry.episode?.number)
    const showSlug = slug(entry.show?.ids)
    return {
      state,
      kind: "episode",
      title: str(entry.episode?.title) ?? show,
      show,
      season,
      episode,
      year: num(entry.show?.year),
      url:
        showSlug && season !== null && episode !== null
          ? `https://trakt.tv/shows/${showSlug}/seasons/${season}/episodes/${episode}`
          : showSlug
            ? `https://trakt.tv/shows/${showSlug}`
            : null,
      poster: null,
      at,
      ...playback,
    }
  }

  return null
}

/** The watching entry's span, straight from Trakt's own start and expiry times. */
function traktTiming(entry: TraktEntry): Timing {
  const ms = (value: unknown) => {
    const iso = isoDate(value)
    return iso ? Date.parse(iso) : null
  }
  return timing(ms(entry.started_at), ms(entry.expires_at))
}

/** The title's TMDB id and kind (the show's for an episode), for the poster lookup. */
export function tmdbRef(
  entry: TraktEntry | null | undefined,
): { kind: "movie" | "tv"; id: number } | null {
  const ids =
    entry?.type === "movie" ? entry.movie?.ids : entry?.type === "episode" ? entry.show?.ids : null
  const id = num(ids?.tmdb)
  return id !== null && Number.isInteger(id) && id > 0
    ? { kind: entry?.type === "movie" ? "movie" : "tv", id }
    : null
}

/** Adds the poster when TMDB is configured; the activity is unchanged otherwise. */
async function withPoster(
  activity: TraktActivity | null,
  entry: TraktEntry | null | undefined,
  env: Env,
  fetchImpl: Fetch,
): Promise<TraktActivity | null> {
  const ref = tmdbRef(entry)
  if (!activity || !ref) return activity
  return { ...activity, poster: await getTmdbPoster(ref.kind, ref.id, env, fetchImpl) }
}

/**
 * What's being watched on Trakt, falling back to the last history entry. Reads a public
 * profile with the client ID only; null when unconfigured, private or unreachable.
 */
export async function getTraktActivity(
  env: Env = process.env,
  fetchImpl: Fetch = fetch,
): Promise<TraktActivity | null> {
  const clientId = env.TRAKT_CLIENT_ID
  const user = env.TRAKT_USERNAME
  if (!clientId || !user) return null
  const headers = {
    "content-type": "application/json",
    "trakt-api-key": clientId,
    "trakt-api-version": "2",
    "user-agent": "itsashik.dev",
  }
  const base = `${API}/users/${encodeURIComponent(user)}`

  const watching = await getJson<TraktEntry>(fetchImpl, `${base}/watching`, { headers })
  if (watching?.data) {
    const activity = toTraktActivity(watching.data, "watching")
    if (activity) return withPoster(activity, watching.data, env, fetchImpl)
  }

  const history = await getJson<TraktEntry[]>(fetchImpl, `${base}/history?limit=1`, { headers })
  const last = Array.isArray(history?.data) ? history.data[0] : null
  return withPoster(toTraktActivity(last, "last"), last, env, fetchImpl)
}
