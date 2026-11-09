/**
 * Helpers for Portable Text bodies (blog posts, case studies). Pure functions, safe anywhere.
 */

interface Span {
  _type?: string
  text?: string
}

interface Block {
  _type: string
  _key?: string
  style?: string
  children?: Span[]
}

export interface TocEntry {
  id: string
  text: string
  level: 2 | 3
}

/** Plain text of a block's spans. */
export function blockText(block: Block): string {
  return (block.children ?? []).map((child) => child.text ?? "").join("")
}

/** Plain text of a whole body, one block per line. */
export function toPlainText(blocks: readonly Block[] | null | undefined): string {
  return (blocks ?? [])
    .filter((block) => block._type === "block")
    .map(blockText)
    .join("\n")
}

/** Number of words in a body's text blocks. */
export function wordCount(blocks: readonly Block[] | null | undefined): number {
  return toPlainText(blocks).split(/\s+/).filter(Boolean).length
}

/** Minutes to read at ~220 words per minute, never less than 1. */
export function readingTime(blocks: readonly Block[] | null | undefined): number {
  return Math.max(1, Math.round(wordCount(blocks) / 220))
}

/** URL-safe slug for a heading: "Why I Started Self-Hosting AI" → "why-i-started-self-hosting-ai". */
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  )
}

/**
 * Table of contents from h2/h3 blocks, plus a block `_key` → id map so the heading renderers
 * use exactly the same (de-duplicated) ids the TOC links to.
 */
export function buildToc(blocks: readonly Block[] | null | undefined): {
  entries: TocEntry[]
  idsByKey: Map<string, string>
} {
  const entries: TocEntry[] = []
  const idsByKey = new Map<string, string>()
  const seen = new Map<string, number>()

  for (const block of blocks ?? []) {
    if (block._type !== "block" || (block.style !== "h2" && block.style !== "h3")) continue
    const text = blockText(block).trim()
    if (!text) continue
    const base = slugify(text)
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    const id = count === 0 ? base : `${base}-${count + 1}`
    entries.push({ id, text, level: block.style === "h2" ? 2 : 3 })
    if (block._key) idsByKey.set(block._key, id)
  }

  return { entries, idsByKey }
}
