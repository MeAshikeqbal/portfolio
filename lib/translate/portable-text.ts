import { escapeHtml, htmlText, textHtml } from "./html"

/**
 * One Portable Text block ↔ the HTML sent to Google Translate.
 *
 * Every span becomes `<a data-k="<span key>">…</a>`, so the translation keeps each span's marks
 * (bold, links, inline code) even when the words move around it; inline code is `translate="no"`.
 * Back from Google, the spans are rebuilt in the translated order with their original keys and
 * marks; text that lands between spans joins the span before it.
 */

export interface Span {
  _type: "span"
  _key: string
  text?: string
  marks?: string[]
  [key: string]: unknown
}

export interface TextBlock {
  _type: "block"
  _key?: string
  children?: (Span | { _type: string; _key?: string })[]
  [key: string]: unknown
}

const isSpan = (child: { _type: string }): child is Span => child._type === "span"

/** The block as HTML, or null when there's nothing to translate (empty, all code, inline objects). */
export function blockHtml(block: TextBlock): string | null {
  const children = block.children ?? []
  if (children.length === 0 || !children.every(isSpan)) return null
  let translatable = false
  const html = children
    .map((span) => {
      const text = span.text ?? ""
      if (span.marks?.includes("code")) {
        return `<a data-k="${span._key}" translate="no">${escapeHtml(text)}</a>`
      }
      if (/\p{L}/u.test(text)) translatable = true
      return `<a data-k="${span._key}">${textHtml(text)}</a>`
    })
    .join("")
  return translatable ? html : null
}

const SPAN = /<a\b[^>]*\bdata-k="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g

/** The block with its spans rebuilt from the translated HTML. */
export function translatedBlock<B extends TextBlock>(block: B, html: string): B {
  const original = new Map(
    (block.children ?? []).filter(isSpan).map((span) => [span._key, span] as const),
  )
  const spans: Span[] = []
  const seen = new Map<string, number>()
  let lead = ""
  let last = 0
  for (const match of html.matchAll(SPAN)) {
    const gap = htmlText(html.slice(last, match.index))
    if (spans.length > 0) spans[spans.length - 1].text += gap
    else lead += gap
    last = match.index + match[0].length

    const source = original.get(match[1])
    if (!source) continue
    // Google can split a span in two; the copy needs a key of its own.
    const count = seen.get(match[1]) ?? 0
    seen.set(match[1], count + 1)
    spans.push({
      ...source,
      _key: count === 0 ? source._key : `${source._key}-${count}`,
      text: htmlText(match[2]),
    })
  }
  const tail = htmlText(html.slice(last))

  // No span markup survived: keep the text, in the first span's marks.
  if (spans.length === 0) {
    const first = [...original.values()][0]
    if (!first) return block
    return { ...block, children: [{ ...first, text: htmlText(html) }] }
  }
  spans[0].text = lead + spans[0].text
  spans[spans.length - 1].text += tail
  return { ...block, children: spans }
}
