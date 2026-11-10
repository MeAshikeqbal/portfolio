/**
 * Live activity shown on /now and in the hero. Shared by the server fetchers and the client,
 * so it holds types only. Every field here is public: fetchers build these objects from an
 * allowlist and never pass upstream responses through.
 */

export interface SpotifyActivity {
  /** "playing" right now, or "last" = the most recent track (paused or recently played). */
  state: "playing" | "last"
  track: string
  artists: string
  /** open.spotify.com link, or null. */
  url: string | null
  /** Small album art on i.scdn.co, or null. */
  art: string | null
  /** When it was played (ISO), for "last"; null while playing. */
  at: string | null
}

export interface TraktActivity {
  state: "watching" | "last"
  kind: "movie" | "episode"
  /** Movie title, or the episode's title. */
  title: string
  /** Show title for episodes. */
  show: string | null
  season: number | null
  episode: number | null
  year: number | null
  /** trakt.tv link, or null. */
  url: string | null
  /** Poster on image.tmdb.org (looked up by the title's TMDB id), or null. */
  poster: string | null
  /** When it was watched (ISO), for "last"; null while watching. */
  at: string | null
}

export interface JellyfinActivity {
  /** Sessions playing something right now. Counts only: no users, titles or devices. */
  streams: number
  direct: number
  transcode: number
  checkedAt: string
}

export interface LiveActivity {
  spotify: SpotifyActivity | null
  trakt: TraktActivity | null
  jellyfin: JellyfinActivity | null
}

export const NO_ACTIVITY: LiveActivity = { spotify: null, trakt: null, jellyfin: null }
