import { escapeHTML, toHTML, type PortableTextComponents } from "@portabletext/to-html"
import type { TypedObject } from "@portabletext/types"
import { urlFor } from "@/sanity/lib/image"

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
    image: ({ value }: { value: { asset?: { _ref?: string }; alt?: string; caption?: string } }) =>
      value?.asset?._ref
        ? `<figure><img src="${escapeHTML(urlFor(value).width(1200).fit("max").auto("format").url())}" alt="${escapeHTML(value.alt ?? "")}"/>${value.caption ? `<figcaption>${escapeHTML(value.caption)}</figcaption>` : ""}</figure>`
        : "",
  },
}

/** A post body as standalone HTML for `<content:encoded>`. */
export function portableTextToFeedHtml(body: TypedObject[] | null | undefined): string {
  if (!body?.length) return ""
  return toHTML(body, { components: feedComponents, onMissingComponent: false })
}
