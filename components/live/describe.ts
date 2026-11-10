import type { Status } from "@/lib/status"
import type { LiveActivity, TraktActivity } from "@/lib/live/types"

/** "The Bear · S2E3" for episodes, "Dune (2021)" for movies. */
export function traktLabel(trakt: TraktActivity): string {
  if (trakt.kind === "movie") return trakt.year ? `${trakt.title} (${trakt.year})` : trakt.title
  const code =
    trakt.season !== null && trakt.episode !== null ? ` · S${trakt.season}E${trakt.episode}` : ""
  return `${trakt.show}${code}`
}

export interface LiveLineContent {
  status: Status
  verb: string
  text: string
  /** Sort key for "last" items: newest wins. */
  at: string | null
}

/**
 * The single most interesting thing for the hero: something playing now beats a stream count,
 * which beats the most recent "last played/watched".
 */
export function pickLiveLine(data: LiveActivity | null | undefined): LiveLineContent | null {
  if (!data) return null
  const { spotify, trakt, jellyfin } = data
  if (spotify?.state === "playing") {
    return {
      status: "up",
      verb: "listening to",
      text: `${spotify.track} · ${spotify.artists}`,
      at: null,
    }
  }
  if (trakt?.state === "watching") {
    return { status: "up", verb: "watching", text: traktLabel(trakt), at: null }
  }
  if (jellyfin && jellyfin.streams > 0) {
    const noun = jellyfin.streams === 1 ? "stream" : "streams"
    return {
      status: "up",
      verb: "jellyfin",
      text: `${jellyfin.streams} ${noun} right now`,
      at: null,
    }
  }
  const last: LiveLineContent[] = []
  if (spotify) {
    last.push({
      status: "idle",
      verb: "last played",
      text: `${spotify.track} · ${spotify.artists}`,
      at: spotify.at,
    })
  }
  if (trakt)
    last.push({ status: "idle", verb: "last watched", text: traktLabel(trakt), at: trakt.at })
  last.sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""))
  return last[0] ?? null
}

export interface NowPlaying {
  kind: "listening" | "watching"
  /** "blue — yung kai", or "The Mentalist · S3E18". */
  text: string
  /** Playback span, when the source reports one. */
  startedAt: string | null
  endsAt: string | null
}

/**
 * What's playing at this moment, for the statusline. Only live states: "last played" history
 * never shows there. Same order as the hero line, so the two never disagree: listening first.
 */
export function pickNowPlaying(data: LiveActivity | null | undefined): NowPlaying | null {
  const { spotify, trakt } = data ?? {}
  if (spotify?.state === "playing") {
    return {
      kind: "listening",
      text: spotify.artists ? `${spotify.track} — ${spotify.artists}` : spotify.track,
      startedAt: spotify.startedAt,
      endsAt: spotify.endsAt,
    }
  }
  if (trakt?.state === "watching") {
    return {
      kind: "watching",
      text: traktLabel(trakt),
      startedAt: trakt.startedAt,
      endsAt: trakt.endsAt,
    }
  }
  return null
}
