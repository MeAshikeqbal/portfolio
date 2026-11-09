import "server-only"

import type { TraktActivity } from "./types"
import { getJson, isoDate, num, str, type Env, type Fetch } from "./http"

const API = "https://api.trakt.tv"

interface TraktIds {
  slug?: unknown
}
interface TraktEntry {
  type?: unknown
  watched_at?: unknown
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
      at,
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
      at,
    }
  }

  return null
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
    if (activity) return activity
  }

  const history = await getJson<TraktEntry[]>(fetchImpl, `${base}/history?limit=1`, { headers })
  return Array.isArray(history?.data) ? toTraktActivity(history.data[0], "last") : null
}
