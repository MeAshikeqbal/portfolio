/**
 * Converts the old `code` *annotation* (a snippet attached to a span of paragraph text) into
 * `code` *blocks* (sanity/schemaTypes/blockContentType.ts). Pure, so it can be unit-tested;
 * scripts/code-annotations-to-blocks.ts applies it to the dataset.
 */

interface MarkDef {
  _key: string
  _type: string
  code?: unknown
  language?: string | null
  filename?: string | null
  highlightedLines?: number[] | null
  [key: string]: unknown
}

interface Span {
  _key: string
  _type: string
  text?: string
  marks?: string[]
  [key: string]: unknown
}

interface TextBlock {
  _key: string
  _type: "block"
  children?: Span[]
  markDefs?: MarkDef[]
  [key: string]: unknown
}

// A type alias (not an interface) so it's assignable to `Item`'s index signature.
export type CodeBlock = {
  _key: string
  _type: "code"
  code: string
  language?: string
  filename?: string
  highlightedLines?: number[]
}

type Item = { _key: string; _type: string; [key: string]: unknown }

const isCodeDef = (def: MarkDef) => def._type === "code" && typeof def.code === "string"

function toCodeBlock(def: MarkDef, key: string): CodeBlock {
  return {
    _key: key,
    _type: "code",
    code: def.code as string,
    ...(def.language ? { language: def.language } : {}),
    ...(def.filename ? { filename: def.filename } : {}),
    ...(def.highlightedLines?.length ? { highlightedLines: def.highlightedLines } : {}),
  }
}

/**
 * Splits one paragraph around its code annotations: plain text before/after a snippet stays a
 * paragraph (whitespace-only leftovers are dropped), each snippet becomes a code block.
 */
function splitBlock(block: TextBlock): Item[] {
  const defs = block.markDefs ?? []
  const codeDefs = new Map(defs.filter(isCodeDef).map((def) => [def._key, def]))
  const otherDefs = defs.filter((def) => !codeDefs.has(def._key))

  const out: Item[] = []
  let text: Span[] = []
  let lastCode: string | null = null
  const nextKey = () => (out.length === 0 ? block._key : `${block._key}-${out.length}`)

  const flushText = () => {
    if (text.some((span) => (span.text ?? "").trim())) {
      const used = new Set(text.flatMap((span) => span.marks ?? []))
      out.push({
        ...block,
        _key: nextKey(),
        children: text,
        markDefs: otherDefs.filter((def) => used.has(def._key)),
      })
    }
    text = []
  }

  for (const span of block.children ?? []) {
    const codeKey = (span.marks ?? []).find((mark) => codeDefs.has(mark))
    if (!codeKey) {
      text.push(span)
      lastCode = null
      continue
    }
    // Several spans can share one annotation; emit its snippet once.
    if (codeKey === lastCode) continue
    flushText()
    out.push(toCodeBlock(codeDefs.get(codeKey)!, nextKey()))
    lastCode = codeKey
  }
  flushText()
  return out
}

/**
 * Returns the converted body, how many paragraphs were rewritten, and the keys of list items
 * that were left alone: splitting one around a code block would break up the list, so those
 * need converting by hand.
 */
export function convertCodeAnnotations(body: Item[]): {
  body: Item[]
  converted: number
  skippedListItems: string[]
} {
  let converted = 0
  const skippedListItems: string[] = []
  const next = body.flatMap((item) => {
    if (item._type !== "block") return [item]
    const block = item as TextBlock
    if (!(block.markDefs ?? []).some(isCodeDef)) return [item]
    const split = splitBlock(block)
    if (block.listItem && split.length > 1) {
      skippedListItems.push(block._key)
      return [item]
    }
    converted++
    return split
  })
  return { body: next, converted, skippedListItems }
}
