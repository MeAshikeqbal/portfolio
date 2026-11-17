import { createHash } from "node:crypto"
import type { PortableTextBlock, PortableTextSpan, TypedObject } from "@portabletext/types"
import { siteConfig } from "./site"
import { playableKind, sanityFileUrl, youtubeId, youtubeWatchUrl, type VideoValue } from "./video"

/**
 * A post as Markdown: the English original, served at /post/<slug>.md and the exact bytes its
 * PGP signature covers (scripts/sign-posts.ts signs them, /post/<slug>.md.asc serves it).
 *
 * The output has to be byte-for-byte stable: any change here, however small, makes every
 * signed post's signature stop matching until it's re-signed. That's why this is a small
 * hand-written serializer with no Markdown library underneath (an upgrade could re-space a
 * list), and why tests/unit/post-markdown.test.ts pins the output. Relative imports only:
 * the signing script loads this file outside Next.
 */

/** The fields a post's Markdown is built from. Kept in step with POST_SOURCE_QUERY. */
export interface PostSource {
  title: string | null
  slug: string | null
  publishedAt: string | null
  author: string | null
  excerpt: string | null
  body: TypedObject[] | null
}

/** The Sanity project the CDN URLs point at. */
export interface SanityProject {
  projectId: string
  dataset: string
}

/** The GROQ projection behind PostSource (queries.ts spells it out for typegen; a test compares). */
export const POST_SOURCE_PROJECTION = `
  _id,
  title,
  "slug": slug.current,
  publishedAt,
  "author": author->name,
  excerpt,
  body
`

export function postToMarkdown(post: PostSource, project: SanityProject): string {
  const title = post.title?.trim() || "Untitled"
  const front = [
    "---",
    `title: ${JSON.stringify(title)}`,
    `author: ${JSON.stringify(post.author || siteConfig.name)}`,
    ...(post.publishedAt ? [`published: ${post.publishedAt.slice(0, 10)}`] : []),
    ...(post.slug ? [`canonical: ${siteConfig.url}/post/${post.slug}`] : []),
    ...(post.excerpt?.trim() ? [`description: ${JSON.stringify(post.excerpt.trim())}`] : []),
    "---",
  ].join("\n")

  const body = bodyToMarkdown(post.body ?? [], project)
  return `${front}\n\n# ${escapeLineStart(escapeText(title))}\n${body ? `\n${body}\n` : ""}`
}

/** SHA-256 of the Markdown's UTF-8 bytes, hex: what a signature is matched against. */
export function markdownDigest(markdown: string): string {
  return createHash("sha256").update(markdown, "utf8").digest("hex")
}

/** A stored signature, as POST_SOURCE_QUERY returns it. */
export interface StoredSignature {
  sha256: string | null
  signature: string | null
  fingerprint: string | null
  signedAt: string | null
}

/**
 * The signature to serve with `markdown`: only one made by `fingerprint` over these exact
 * bytes. After an edit (or a change to this serializer) there's none until the next signing.
 */
export function signatureFor(
  markdown: string,
  stored: StoredSignature | null | undefined,
  fingerprint: string,
): { armored: string; signedAt: string | null } | null {
  if (!stored?.signature || stored.fingerprint !== fingerprint) return null
  if (stored.sha256 !== markdownDigest(markdown)) return null
  return { armored: stored.signature, signedAt: stored.signedAt }
}

/** Blocks as Markdown, separated by blank lines (list items by single newlines). */
export function bodyToMarkdown(blocks: readonly TypedObject[], project: SanityProject): string {
  const out: string[] = []
  // Per list level: the kind of list and the next number, so numbering restarts per list.
  let counters: { kind: string; next: number }[] = []
  let inList = false

  for (const block of blocks) {
    if (isListItem(block)) {
      const level = Math.max(1, block.level ?? 1)
      const kind = block.listItem
      counters = counters.slice(0, level)
      const current = counters[level - 1]
      const number = current && current.kind === kind ? current.next : 1
      counters[level - 1] = { kind, next: number + 1 }
      const marker = kind === "number" ? `${number}. ` : "- "
      const indent = "    ".repeat(level - 1)
      const text = inline(block)
      if (!text) continue
      const item = prefixLines(
        escapeLineStart(text),
        indent + marker,
        " ".repeat(indent.length + marker.length),
      )
      if (inList) out[out.length - 1] += `\n${item}`
      else out.push(item)
      inList = true
      continue
    }
    inList = false
    counters = []
    const rendered = renderBlock(block, project)
    if (rendered) out.push(rendered)
  }
  return out.join("\n\n")
}

function renderBlock(block: TypedObject, project: SanityProject): string {
  if (isTextBlock(block)) {
    const text = inline(block)
    if (!text) return ""
    switch (block.style) {
      case "h2":
      case "h3":
      case "h4":
        // A heading is one line: a soft break becomes a space.
        return `${"#".repeat(Number(block.style[1]))} ${text.replace(/\\\n/g, " ")}`
      case "blockquote":
        return prefixLines(escapeLineStart(text), "> ", "> ")
      default:
        return escapeLineStart(text)
    }
  }

  switch (block._type) {
    case "code": {
      const { code, language, filename } = block as TypedObject & {
        code?: string
        language?: string
        filename?: string
      }
      if (!code) return ""
      // A fence longer than any backtick run inside the code.
      const longest = Math.max(2, ...(code.match(/`+/g) ?? []).map((run) => run.length))
      const fence = "`".repeat(longest + 1)
      const info = [language, filename ? `title=${JSON.stringify(filename)}` : ""]
        .filter(Boolean)
        .join(" ")
      return `${fence}${info}\n${code.replace(/\n+$/, "")}\n${fence}`
    }
    case "callout": {
      const { tone, title, text } = block as TypedObject & {
        tone?: string
        title?: string
        text?: string
      }
      if (!text?.trim()) return ""
      // GitHub's alert syntax; elsewhere it reads as an ordinary quote.
      const lines = [
        tone === "warning" ? "[!WARNING]" : "[!NOTE]",
        ...(title?.trim() ? [`**${escapeText(title.trim())}**`] : []),
        escapeLineStart(escapeText(text.trim()).replace(/\n/g, "\\\n")),
      ]
      return prefixLines(lines.join("\n"), "> ", "> ")
    }
    case "image": {
      const { asset, alt, caption } = block as TypedObject & {
        asset?: { _ref?: string }
        alt?: string
        caption?: string
      }
      const src = sanityImageUrl(asset?._ref, project)
      if (!src) return ""
      const image = `![${escapeText(alt?.trim() ?? "")}](${src})`
      return caption?.trim() ? `${image}\n*${escapeText(caption.trim())}*` : image
    }
    case "video": {
      const value = block as TypedObject & VideoValue
      const kind = playableKind(value)
      const href =
        kind === "youtube"
          ? youtubeWatchUrl(youtubeId(value.youtubeUrl)!)
          : kind === "upload"
            ? sanityFileUrl(value.file?.asset?._ref, project)
            : null
      if (!href) return ""
      const link = `[Video: ${escapeText(value.title?.trim() || "watch")}](${href})`
      return value.caption?.trim() ? `${link}\n*${escapeText(value.caption.trim())}*` : link
    }
    default:
      return ""
  }
}

type TextBlock = PortableTextBlock & { style?: string; listItem?: string; level?: number }

function isTextBlock(block: TypedObject): block is TextBlock {
  return block._type === "block" && Array.isArray((block as PortableTextBlock).children)
}

function isListItem(block: TypedObject): block is TextBlock & { listItem: string } {
  return isTextBlock(block) && typeof block.listItem === "string" && block.listItem.length > 0
}

/** Markdown delimiters for the decorators the schema allows. */
const DECORATORS: Record<string, string> = {
  strong: "**",
  em: "_",
  "strike-through": "~~",
}

/**
 * A text block's spans as inline Markdown. Marks open in the order that keeps them open
 * longest (so "**a _b_ c**" nests instead of "**a** **_b_** **c**"), close when a span no
 * longer carries them, and never wrap the spaces at their edges, which would stop them
 * counting as emphasis.
 */
function inline(block: TextBlock): string {
  const spans = block.children.filter(
    (child): child is PortableTextSpan => child._type === "span" && typeof child.text === "string",
  )
  const defs = new Map((block.markDefs ?? []).map((def) => [def._key, def]))
  const stack: string[] = []
  let out = ""

  const opener = (mark: string) =>
    mark === "code" ? "`" : (DECORATORS[mark] ?? (defs.has(mark) ? "[" : ""))
  const closer = (mark: string) => {
    if (mark === "code") return "`"
    if (DECORATORS[mark]) return DECORATORS[mark]
    const def = defs.get(mark) as { _type?: string; href?: string } | undefined
    return def?._type === "link" && def.href ? `](${linkTarget(def.href)})` : def ? "]" : ""
  }
  const closeTo = (depth: number) => {
    // Closers go before any trailing spaces.
    const trailing = out.match(/\s*$/)![0]
    out = out.slice(0, out.length - trailing.length)
    while (stack.length > depth) out += closer(stack.pop()!)
    out += trailing
  }

  spans.forEach((span, index) => {
    const marks = (span.marks ?? []).filter((mark) => opener(mark) !== "")
    // Keep the open marks this span still carries, up to the first one it doesn't.
    let keep = 0
    while (keep < stack.length && marks.includes(stack[keep])) keep++
    closeTo(keep)

    const remaining = marks
      .filter((mark) => !stack.includes(mark))
      .map((mark) => ({ mark, run: runLength(spans, index, mark) }))
      // Longest run outermost; code innermost, since nothing nests inside a code span.
      .sort((a, b) => (a.mark === "code" ? 1 : b.mark === "code" ? -1 : b.run - a.run))
      .map(({ mark }) => mark)

    const inCode = [...stack, ...remaining].includes("code")
    let text = inCode ? span.text : escapeText(span.text)
    if (remaining.length > 0) {
      const leading = text.match(/^\s*/)![0]
      out += leading
      text = text.slice(leading.length)
      for (const mark of remaining) {
        out += opener(mark)
        stack.push(mark)
      }
    }
    out += text.replace(/\n/g, "\\\n")
  })
  closeTo(0)
  return out.trim()
}

/** How many spans in a row, from `index`, carry `mark`. */
function runLength(spans: PortableTextSpan[], index: number, mark: string): number {
  let length = 0
  while (spans[index + length]?.marks?.includes(mark)) length++
  return length
}

/** Escapes characters Markdown would read as inline syntax. */
function escapeText(text: string): string {
  return text
    .replace(/([\\`*[\]<~])/g, "\\$1")
    .replace(/(?<![\p{L}\p{N}])_|_(?![\p{L}\p{N}])/gu, "\\_")
}

/** Escapes a line start that Markdown would read as a heading, quote, list or rule. */
function escapeLineStart(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/^(\s*)([#>+=-])/, "$1\\$2").replace(/^(\s*\d+)([.)])/, "$1\\$2"))
    .join("\n")
}

/** Prefixes the first line with `first` and the rest with `rest`. */
function prefixLines(text: string, first: string, rest: string): string {
  return text
    .split("\n")
    .map((line, i) => `${i === 0 ? first : rest}${line}`.replace(/\s+$/, ""))
    .join("\n")
}

/** A link target as an absolute URL that can't end the Markdown link early. */
function linkTarget(href: string): string {
  const absolute = href.startsWith("/") ? `${siteConfig.url}${href}` : href
  // encodeURIComponent leaves parentheses alone, and one would close the link.
  return absolute.replace(
    /[\s()]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`,
  )
}

/** The original image on the CDN from its asset reference ("image-<id>-<w>x<h>-<ext>"). */
export function sanityImageUrl(
  ref: string | null | undefined,
  project: SanityProject,
): string | null {
  const match = ref?.match(/^image-([a-f0-9]+)-(\d+x\d+)-([a-z0-9]+)$/i)
  if (!match) return null
  return `https://cdn.sanity.io/images/${project.projectId}/${project.dataset}/${match[1]}-${match[2]}.${match[3]}`
}
