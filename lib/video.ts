/**
 * Project and case-study videos (Sanity type `video`): either a short clip uploaded to Sanity
 * or a YouTube link. Pure helpers, shared by the site, the RSS feed and the Studio.
 */

export type VideoKind = "upload" | "youtube"

/** The `video` object as stored in Sanity (raw: file is an asset reference). */
export interface VideoValue {
  _type?: "video"
  _key?: string
  kind?: VideoKind | null
  title?: string | null
  caption?: string | null
  file?: { asset?: { _ref?: string } | null } | null
  youtubeUrl?: string | null
  poster?: { asset?: { _ref?: string } | null; alt?: string | null } | null
  /** Uploads only: play muted on a loop like a GIF (no controls, no sound). */
  loop?: boolean | null
}

/** Formats an uploaded video may use (also the Studio upload filter). */
export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm"] as const

const YOUTUBE_ID = /^[\w-]{11}$/

/**
 * The 11-character video id from any common YouTube URL (watch, youtu.be, shorts, embed, live,
 * music, nocookie), or null.
 */
export function youtubeId(input: string | null | undefined): string | null {
  if (!input) return null
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return null
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null
  const host = url.hostname.replace(/^(www|m|music)\./, "")
  let id: string | null = null
  if (host === "youtu.be") id = url.pathname.split("/")[1] ?? null
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v")
    else {
      const [section, value] = url.pathname.split("/").filter(Boolean)
      if (["embed", "shorts", "live", "v"].includes(section ?? "")) id = value ?? null
    }
  }
  return id && YOUTUBE_ID.test(id) ? id : null
}

/** Start offset in seconds from a YouTube URL's `t` / `start` parameter ("90", "1m30s"). */
export function youtubeStart(input: string | null | undefined): number | null {
  if (!input) return null
  try {
    const url = new URL(input.trim())
    const raw = url.searchParams.get("t") ?? url.searchParams.get("start")
    if (!raw) return null
    const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/)
    if (!match) return null
    const [, h, m, s] = match
    const seconds = Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0)
    return seconds > 0 ? seconds : null
  } catch {
    return null
  }
}

/** Privacy-enhanced embed URL (no cookies until the visitor plays it). */
export function youtubeEmbedUrl(id: string, start?: number | null): string {
  const params = new URLSearchParams({ autoplay: "1", rel: "0", modestbranding: "1" })
  if (start) params.set("start", String(start))
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`
}

export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`
}

/** YouTube's own thumbnail (always exists in this size). */
export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}

/**
 * CDN URL for an uploaded file from its asset reference ("file-<hash>-<ext>"), without a
 * query, or null for a malformed reference.
 */
export function sanityFileUrl(
  ref: string | null | undefined,
  project: { projectId: string; dataset: string },
): string | null {
  const match = ref?.match(/^file-([a-f0-9]+)-([a-z0-9]+)$/i)
  if (!match) return null
  return `https://cdn.sanity.io/files/${project.projectId}/${project.dataset}/${match[1]}.${match[2]}`
}

/** MIME type for an uploaded video, from the extension in its reference. */
export function videoMimeType(ref: string | null | undefined): string | undefined {
  const ext = ref?.split("-").pop()?.toLowerCase()
  return ext === "webm" ? "video/webm" : ext === "mp4" || ext === "m4v" ? "video/mp4" : undefined
}

/** Which kind a stored value resolves to, or null when it has nothing playable. */
export function playableKind(value: VideoValue | null | undefined): VideoKind | null {
  if (!value) return null
  const kind = value.kind ?? (value.youtubeUrl ? "youtube" : "upload")
  if (kind === "youtube") return youtubeId(value.youtubeUrl) ? "youtube" : null
  return value.file?.asset?._ref ? "upload" : null
}
