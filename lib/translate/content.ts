import type { TranslatableType } from "./types"
import { htmlText, textHtml } from "./html"
import { blockHtml, translatedBlock, type TextBlock } from "./portable-text"

/**
 * What gets translated in each document type, and how its translated copy is built.
 *
 * A builder runs twice with the same document: once to list every piece of text (as the HTML
 * sent to Google), then to assemble the copy from the translations. The copy keeps the source's
 * shape (array keys, images, URLs, code, names) and only swaps the text, so queries can prefer
 * it field by field (sanity/lib/queries.ts). Never translated: slugs, URLs, tech tags, company
 * and school names, homelab machine names, code blocks.
 */

type Doc = Record<string, unknown> & { _type: string }
type Obj = Record<string, unknown>

/** Translates one piece of text; each builder pass supplies its own. */
interface Pass {
  /** HTML in, HTML out (or the source while listing). */
  html: (html: string) => string
}

const text = (pass: Pass, value: unknown): string | undefined => {
  if (typeof value !== "string" || !/\p{L}/u.test(value)) {
    return typeof value === "string" ? value : undefined
  }
  return htmlText(pass.html(textHtml(value)))
}

const obj = (value: unknown): Obj | undefined =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Obj) : undefined

const list = (value: unknown): Obj[] | undefined =>
  Array.isArray(value) ? (value as Obj[]) : undefined

/** Portable Text: text blocks span by span; callouts, images and videos by their text fields. */
function blocks(pass: Pass, value: unknown): Obj[] | undefined {
  return list(value)?.map((block) => {
    switch (block._type) {
      case "block": {
        const html = blockHtml(block as TextBlock)
        return html ? translatedBlock(block as TextBlock, pass.html(html)) : block
      }
      case "callout":
        return { ...block, title: text(pass, block.title), text: text(pass, block.text) }
      case "image":
        return { ...block, alt: text(pass, block.alt), caption: text(pass, block.caption) }
      case "video":
        return video(pass, block)!
      default:
        // Code blocks and anything unknown stay as written.
        return block
    }
  })
}

function image(pass: Pass, value: unknown): Obj | undefined {
  const source = obj(value)
  return source && { ...source, alt: text(pass, source.alt) }
}

function video(pass: Pass, value: unknown): Obj | undefined {
  const source = obj(value)
  if (!source) return undefined
  const poster = obj(source.poster)
  return {
    ...source,
    title: text(pass, source.title),
    caption: text(pass, source.caption),
    ...(poster && { poster: { ...poster, alt: text(pass, poster.alt) } }),
  }
}

function seo(pass: Pass, value: unknown): Obj | undefined {
  const source = obj(value)
  return (
    source && {
      ...source,
      title: text(pass, source.title),
      description: text(pass, source.description),
    }
  )
}

/**
 * The excerpt lists show when the post has none of its own, as the queries derive it: the
 * first 200 characters of its paragraphs.
 */
export function derivedExcerpt(body: unknown): string | undefined {
  const paragraphs = (list(body) ?? [])
    .filter((block) => block._type === "block" && (block.style ?? "normal") === "normal")
    .map((block) =>
      (list(block.children) ?? []).map((child) => (child.text as string) ?? "").join(""),
    )
    .join("\n\n")
  return paragraphs ? [...paragraphs].slice(0, 200).join("") : undefined
}

const BUILDERS: Record<TranslatableType, (doc: Doc, pass: Pass) => Obj> = {
  post: (doc, pass) => ({
    title: text(pass, doc.title),
    excerpt: text(pass, doc.excerpt ?? derivedExcerpt(doc.body)),
    body: blocks(pass, doc.body),
    mainImage: image(pass, doc.mainImage),
    seo: seo(pass, doc.seo),
  }),
  project: (doc, pass) => ({
    title: text(pass, doc.title),
    description: text(pass, doc.description),
    body: blocks(pass, doc.body),
    mainImage: image(pass, doc.mainImage),
    video: video(pass, doc.video),
    seo: seo(pass, doc.seo),
  }),
  now: (doc, pass) => ({
    location: text(pass, doc.location),
    body: blocks(pass, doc.body),
    archive: list(doc.archive)?.map((entry) => ({
      ...entry,
      location: text(pass, entry.location),
      body: blocks(pass, entry.body),
    })),
  }),
  uses: (doc, pass) => ({
    intro: text(pass, doc.intro),
    sections: list(doc.sections)?.map((section) => ({
      ...section,
      title: text(pass, section.title),
      // Item names are machine and product names (and the lab's node names): never translated.
      items: list(section.items)?.map((item) => ({
        ...item,
        description: text(pass, item.description),
      })),
    })),
  }),
  labChange: (doc, pass) => ({ title: text(pass, doc.title), note: text(pass, doc.note) }),
  experiences: (doc, pass) => ({
    works: list(doc.works)?.map((work) => ({
      ...work,
      name: text(pass, work.name),
      desc: text(pass, work.desc),
    })),
  }),
  education: (doc, pass) => ({ degree: text(pass, doc.degree), desc: text(pass, doc.desc) }),
  category: (doc, pass) => ({ title: text(pass, doc.title) }),
}

export function isTranslatable(type: string): type is TranslatableType {
  return type in BUILDERS
}

/** Drops undefined fields (and empty objects they leave), so the copy only holds what exists. */
function compact<T>(value: T): T {
  if (Array.isArray(value)) return value.map(compact) as T
  if (value && typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined)
    return Object.fromEntries(entries.map(([k, v]) => [k, compact(v)])) as T
  }
  return value
}

/** Every piece of HTML the document's translation needs, in a stable order. */
export function segmentsOf(doc: Doc): string[] {
  const builder = BUILDERS[doc._type as TranslatableType]
  if (!builder) return []
  const segments = new Set<string>()
  builder(doc, {
    html: (html) => {
      segments.add(html)
      return html
    },
  })
  return [...segments]
}

/**
 * The translated copy of the document's translatable fields. `translations` maps each segment
 * to its translation; a missing one keeps the English text.
 */
export function translatedContent(doc: Doc, translations: ReadonlyMap<string, string>): Obj {
  const builder = BUILDERS[doc._type as TranslatableType]
  if (!builder) return {}
  return compact(builder(doc, { html: (html) => translations.get(html) ?? html }))
}
