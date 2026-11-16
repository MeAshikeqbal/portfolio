import {
  parse,
  TYPE,
  type MessageFormatElement,
  type PluralElement,
  type SelectElement,
} from "@formatjs/icu-messageformat-parser"
import { printAST } from "@formatjs/icu-messageformat-parser/printer.js"
import { decodeHtml, textHtml, tidyPunctuation } from "./html"

/**
 * Machine translation for ICU messages without breaking them.
 *
 * A message is split into "runs": the text at one nesting level. Each run goes to Google as HTML
 * in which every argument (`{name}`), `#`, nested plural/select and empty tag is an opaque
 * `<span translate="no">pN</span>`, and every tag with content (`<link>now page</link>`) is a
 * translatable `<span data-t="N">…</span>`, so the text around it moves with the translation.
 * Plural and select branches are runs of their own. `rebuild` puts the translated runs back
 * together as ICU in the target language's plural categories; `verify` checks the result.
 */

/** One piece of text for the translator; `html` is what's sent. */
export interface Run {
  html: string
}

type Slot =
  { kind: "atom"; element: MessageFormatElement } | { kind: "tag"; name: string; run: PreparedRun }

/** A run with what its placeholders stand for. */
interface PreparedRun {
  html: string
  slots: Slot[]
  /** Branches of nested plurals/selects, by atom slot index. */
  branches: Map<number, { element: PluralElement | SelectElement; runs: Map<string, PreparedRun> }>
  /** Inside a plural branch, `#` is the count and a literal # must be escaped. */
  inPlural: boolean
}

export interface PreparedMessage {
  source: string
  root: PreparedRun
  /** Every HTML string to translate, in a stable order. */
  segments: string[]
}

function prepareRun(elements: MessageFormatElement[], inPlural: boolean): PreparedRun {
  const run: PreparedRun = { html: "", slots: [], branches: new Map(), inPlural }
  for (const element of elements) {
    if (element.type === TYPE.literal) {
      run.html += textHtml(element.value)
      continue
    }
    if (element.type === TYPE.tag && element.children.length > 0) {
      const index = run.slots.length
      const inner = prepareRun(element.children, inPlural)
      run.slots.push({ kind: "tag", name: element.value, run: inner })
      run.html += `<span data-t="${index}">${inner.html}</span>`
      continue
    }
    const index = run.slots.length
    run.slots.push({ kind: "atom", element })
    run.html += `<span translate="no">p${index}</span>`
    if (element.type === TYPE.plural || element.type === TYPE.select) {
      const runs = new Map<string, PreparedRun>()
      for (const [key, option] of Object.entries(element.options)) {
        runs.set(key, prepareRun(option.value, element.type === TYPE.plural))
      }
      run.branches.set(index, { element, runs })
    }
  }
  return run
}

function collect(run: PreparedRun, out: string[]) {
  if (/\S/.test(stripMarkup(run.html))) out.push(run.html)
  for (const slot of run.slots) if (slot.kind === "tag") collectTag(slot.run, out)
  for (const { runs } of run.branches.values())
    for (const branch of runs.values()) collect(branch, out)
}

/** A tag's content is translated as part of its run, but its nested branches are not. */
function collectTag(run: PreparedRun, out: string[]) {
  for (const slot of run.slots) if (slot.kind === "tag") collectTag(slot.run, out)
  for (const { runs } of run.branches.values())
    for (const branch of runs.values()) collect(branch, out)
}

/** Text a translator would see, without our placeholders (empty means nothing to translate). */
function stripMarkup(html: string): string {
  return html.replace(/<span translate="no">p\d+<\/span>/g, "").replace(/<[^>]+>/g, "")
}

/** Parses an English ICU message and lists what needs translating. */
export function prepare(message: string): PreparedMessage {
  const root = prepareRun(parse(message, { ignoreTag: false }), false)
  const segments: string[] = []
  collect(root, segments)
  return { source: message, root, segments }
}

/** Literal text as ICU: apostrophes doubled, braces quoted, `#` quoted inside plurals. */
function escapeIcu(text: string, inPlural: boolean): string {
  let out = text.replace(/'/g, "''").replace(/[{}]/g, (c) => `'${c}'`)
  if (inPlural) out = out.replace(/#/g, "'#'")
  return out
}

const ATOM = /<span[^>]*\btranslate="no"[^>]*>\s*p(\d+)\s*<\/span>/g
const KEEP = /<span[^>]*\btranslate="no"[^>]*>([\s\S]*?)<\/span>/g
const TAG = /<span[^>]*\bdata-t="(\d+)"[^>]*>([\s\S]*?)<\/span>/

/** One run's translated HTML back to ICU. */
function rebuildRun(
  run: PreparedRun,
  html: string | undefined,
  translations: Map<string, string>,
  locale: string,
): string {
  // Runs with nothing to translate (only placeholders) are rebuilt from their own markup.
  let text = html ?? run.html
  const parts: string[] = []
  // Tags first: their content may hold atoms that belong to the same slot list.
  let match: RegExpExecArray | null
  while ((match = TAG.exec(text))) {
    const slot = run.slots[Number(match[1])]
    const name = slot?.kind === "tag" ? slot.name : "span"
    // The tag's content has its own placeholder numbering (its run's slots).
    const inner = slot?.kind === "tag" ? finish(match[2], slot.run, translations, locale, []) : ""
    const marker = `\u0000${parts.length}\u0000`
    parts.push(`<${name}>${inner}</${name}>`)
    text = text.slice(0, match.index) + marker + text.slice(match.index + match[0].length)
  }
  return finish(text, run, translations, locale, parts)
}

/** Placeholders back to ICU, protected names unwrapped, the rest of the text escaped. */
function finish(
  html: string,
  run: PreparedRun,
  translations: Map<string, string>,
  locale: string,
  parts: string[],
): string {
  const atoms: string[] = []
  let text = html.replace(ATOM, (_, index: string) => {
    const marker = `\u0001${atoms.length}\u0001`
    atoms.push(atomIcu(run, Number(index), translations, locale))
    return marker
  })
  text = text.replace(KEEP, "$1").replace(/<[^>]+>/g, "")
  text = escapeIcu(tidyPunctuation(decodeHtml(text)), run.inPlural)
  return text
    .replace(/\u0001(\d+)\u0001/g, (_, i: string) => atoms[Number(i)])
    .replace(/\u0000(\d+)\u0000/g, (_, i: string) => parts[Number(i)])
}

function atomIcu(
  run: PreparedRun,
  index: number,
  translations: Map<string, string>,
  locale: string,
): string {
  const slot = run.slots[index]
  if (!slot || slot.kind !== "atom") throw new Error(`Unknown placeholder p${index}`)
  const { element } = slot
  if (element.type === TYPE.pound) return "#"
  const branches = run.branches.get(index)
  if (!branches) return printAST([element])

  const { element: choice, runs } = branches
  const translated = (key: string) => {
    const branch = runs.get(key)!
    return rebuildRun(branch, translations.get(branch.html), translations, locale)
  }
  if (choice.type === TYPE.select) {
    const options = [...runs.keys()].map((key) => `${key} {${translated(key)}}`).join(" ")
    return `{${choice.value}, select, ${options}}`
  }
  // Plurals: the target language's categories, each filled from the matching English branch
  // (or "other"); exact matches (=0) carry over.
  const categories = new Intl.PluralRules(locale, { type: choice.pluralType }).resolvedOptions()
    .pluralCategories
  const exact = [...runs.keys()].filter((key) => key.startsWith("="))
  const keys = [...exact, ...categories.filter((c) => c !== "other"), "other"]
  const options = keys
    .map((key) => `${key} {${translated(runs.has(key) ? key : "other")}}`)
    .join(" ")
  const offset = choice.offset ? ` offset:${choice.offset}` : ""
  const type = choice.pluralType === "ordinal" ? "selectordinal" : "plural"
  return `{${choice.value}, ${type},${offset} ${options}}`
}

/** The translated ICU message. `translations` maps each prepared segment to Google's output. */
export function rebuild(
  prepared: PreparedMessage,
  translations: Map<string, string>,
  locale: string,
): string {
  return rebuildRun(prepared.root, translations.get(prepared.root.html), translations, locale)
}

/** Argument and tag names a message uses, for comparing a translation with its source. */
export function signature(message: string): string[] {
  const names = new Set<string>()
  const walk = (elements: MessageFormatElement[]) => {
    for (const element of elements) {
      if (element.type === TYPE.literal || element.type === TYPE.pound) continue
      names.add(element.type === TYPE.tag ? `<${element.value}>` : element.value)
      if (element.type === TYPE.tag) walk(element.children)
      if (element.type === TYPE.plural || element.type === TYPE.select) {
        for (const option of Object.values(element.options)) walk(option.value)
      }
    }
  }
  walk(parse(message, { ignoreTag: false }))
  return [...names].sort()
}

/** Whether a translation parses and uses exactly the source's arguments and tags. */
export function verify(source: string, translated: string): boolean {
  try {
    return signature(source).join("|") === signature(translated).join("|")
  } catch {
    return false
  }
}
