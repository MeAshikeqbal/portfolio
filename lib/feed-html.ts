import { escapeHTML, toHTML, type PortableTextComponents } from "@portabletext/to-html"
import type { TypedObject } from "@portabletext/types"
import { dataset, projectId } from "@/sanity/env"
import { urlFor } from "@/sanity/lib/image"
import {
  playableKind,
  sanityFileUrl,
  youtubeId,
  youtubeWatchUrl,
  type VideoValue,
} from "@/lib/video"

/** Absolute image URL, or null for a missing or malformed asset reference (never throws). */
function imageUrl(value: { asset?: { _ref?: string } } | undefined): string | null {
  if (!value?.asset?._ref) return null
  try {
    return urlFor(value).width(1200).fit("max").auto("format").url()
  } catch {
    // One broken reference shouldn't take down the whole feed.
    return null
  }
}

/**
 * Plain-HTML renderers for feed readers: no classes, no client code, absolute image URLs.
 * The site's own renderers (components/portable-text) are React server components with Shiki
 * highlighting and styling a reader can't load, so the feed gets its own small set.
 */
const feedComponents: PortableTextComponents = {
  types: {
    code: ({ value }: { value: { code?: string; filename?: string } }) =>
      value?.code
        ? `<figure>${value.filename ? `<figcaption>${escapeHTML(value.filename)}</figcaption>` : ""}<pre><code>${escapeHTML(value.code)}</code></pre></figure>`
        : "",
    callout: ({ value }: { value: { tone?: string; title?: string; text?: string } }) =>
      value?.text
        ? `<blockquote><p><strong>${escapeHTML(value.title || (value.tone === "warning" ? "Warning" : "Note"))}</strong></p><p>${escapeHTML(value.text)}</p></blockquote>`
        : "",
    // Feed readers rarely play embeds: link to the video instead.
    video: ({ value }: { value: VideoValue }) => {
      const kind = playableKind(value)
      const href =
        kind === "youtube"
          ? youtubeWatchUrl(youtubeId(value.youtubeUrl)!)
          : kind === "upload"
            ? sanityFileUrl(value.file?.asset?._ref, { projectId, dataset })
            : null
      if (!href) return ""
      const label = `Video: ${value.title || "watch"}`
      return `<p><a href="${escapeHTML(href)}">${escapeHTML(label)}</a>${value.caption ? ` (${escapeHTML(value.caption)})` : ""}</p>`
    },
    image: ({
      value,
    }: {
      value: { asset?: { _ref?: string }; alt?: string; caption?: string }
    }) => {
      const src = imageUrl(value)
      return src
        ? `<figure><img src="${escapeHTML(src)}" alt="${escapeHTML(value.alt ?? "")}"/>${value.caption ? `<figcaption>${escapeHTML(value.caption)}</figcaption>` : ""}</figure>`
        : ""
    },
  },
}

/** A post body as standalone HTML for `<content:encoded>`. */
export function portableTextToFeedHtml(body: TypedObject[] | null | undefined): string {
  if (!body?.length) return ""
  return toHTML(body, { components: feedComponents, onMissingComponent: false })
}
