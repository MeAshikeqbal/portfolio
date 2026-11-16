import type { Locale } from "../../i18n/locales"
import { translateHtml } from "./google"
import { isTranslatable, segmentsOf, translatedContent } from "./content"
import { hashMessage } from "./messages"

/**
 * Machine-translates one published Sanity document into every other language and stores each
 * copy as a `translation` document (`translation-<lang>-<id>`, sanity/schemaTypes/translationType).
 *
 * Only text that changed is sent to Google: each copy keeps a memory of translated segments by
 * hash, so a typo fix re-translates one paragraph, not the post. A copy marked "Edited by hand"
 * is left alone. If the source changes while translating, nothing is written (the next publish
 * translates the newer version). Called on publish (app/api/sanity-webhook) and by
 * scripts/translate-content.ts.
 */

/** The bits of a Sanity client this needs (the app's write client or the CLI's). */
export interface TranslationClient {
  getDocument<T = Record<string, unknown>>(id: string): Promise<T | undefined>
  fetch<T>(query: string, params?: Record<string, unknown>): Promise<T>
  transaction(): {
    createOrReplace(doc: Record<string, unknown> & { _id: string; _type: string }): unknown
    commit(): Promise<unknown>
  }
  delete(selection: { query: string; params?: Record<string, unknown> }): Promise<unknown>
}

export interface TranslateDocumentOptions {
  client: TranslationClient
  apiKey: string
  /** Target languages (never English). */
  locales: readonly Locale[]
  /** Refuse to send more than this many characters for one document, across languages. */
  maxChars?: number
  /** Translate everything again, ignoring the memory and an unchanged revision. */
  force?: boolean
  /** Work out what would be sent, without calling Google or writing. */
  dryRun?: boolean
  fetch?: typeof fetch
  now?: () => Date
}

export interface LocaleResult {
  locale: Locale
  status: "written" | "unchanged" | "manual" | "would-write"
  /** Characters sent (or that would be sent) to Google. */
  chars: number
}

export type TranslateResult =
  | { id: string; status: "skipped"; reason: string }
  | { id: string; status: "aborted"; reason: string; locales: LocaleResult[] }
  | { id: string; status: "done"; type: string; locales: LocaleResult[] }

interface Existing {
  _id: string
  language: Locale
  manual?: boolean
  sourceRev?: string
  memory?: { hash: string; html: string }[]
}

export const translationId = (locale: string, sourceId: string) =>
  `translation-${locale}-${sourceId}`

/** The default per-document cap: a long post into six languages is ~150k characters. */
const DEFAULT_MAX_CHARS = 300_000

export async function translateDocument(
  id: string,
  options: TranslateDocumentOptions,
): Promise<TranslateResult> {
  const { client, locales, force = false, dryRun = false } = options
  // Drafts and versions aren't on the site; IDs with dots are private paths.
  if (id.includes(".")) return { id, status: "skipped", reason: "not a published document" }

  const doc = await client.getDocument<Record<string, unknown> & { _type: string; _rev: string }>(
    id,
  )
  if (!doc) return { id, status: "skipped", reason: "not found" }
  if (!isTranslatable(doc._type)) return { id, status: "skipped", reason: `type ${doc._type}` }
  // Archived posts stay reachable in English but are out of lists and search: not worth paying for.
  if (doc._type === "post" && doc.archived === true) {
    return { id, status: "skipped", reason: "archived" }
  }

  const existing = await client.fetch<Existing[]>(
    `*[_type == "translation" && source._ref == $id]{ _id, language, manual, sourceRev, memory }`,
    { id },
  )
  const byLocale = new Map(existing.map((e) => [e.language, e]))
  const segments = segmentsOf(doc)

  const plans = locales.map((locale) => {
    const current = byLocale.get(locale)
    const memory = new Map((current?.memory ?? []).map((m) => [m.hash, m.html]))
    if (current?.manual) return { locale, status: "manual" as const, missing: [], memory }
    if (!force && current && current.sourceRev === doc._rev) {
      return { locale, status: "unchanged" as const, missing: [], memory }
    }
    const missing = force ? segments : segments.filter((s) => !memory.has(hashMessage(s)))
    return { locale, status: "translate" as const, missing, memory }
  })
  const results = (): LocaleResult[] =>
    plans.map((plan) => ({
      locale: plan.locale,
      status: plan.status === "translate" ? (dryRun ? "would-write" : "written") : plan.status,
      chars: plan.missing.reduce((sum, s) => sum + s.length, 0),
    }))

  const total = results().reduce((sum, r) => sum + r.chars, 0)
  const cap = options.maxChars ?? DEFAULT_MAX_CHARS
  if (total > cap) {
    return {
      id,
      status: "aborted",
      reason: `${total} characters is over the ${cap} cap`,
      locales: results(),
    }
  }
  if (dryRun) return { id, status: "done", type: doc._type, locales: results() }

  const writes: Record<string, unknown>[] = []
  for (const plan of plans) {
    if (plan.status !== "translate") continue
    if (plan.missing.length > 0) {
      const translated = await translateHtml(plan.missing, {
        apiKey: options.apiKey,
        target: plan.locale,
        fetch: options.fetch,
      })
      plan.missing.forEach((segment, i) => plan.memory.set(hashMessage(segment), translated[i]))
    }
    const translations = new Map(
      segments.map((s) => [s, plan.memory.get(hashMessage(s)) ?? s] as const),
    )
    writes.push({
      _id: translationId(plan.locale, id),
      _type: "translation",
      source: { _type: "reference", _ref: id, _weak: true },
      language: plan.locale,
      manual: false,
      sourceRev: doc._rev,
      translatedAt: (options.now?.() ?? new Date()).toISOString(),
      content: translatedContent(doc, translations),
      // Only what this version uses, so the memory doesn't grow forever.
      memory: segments.map((s) => {
        const hash = hashMessage(s)
        return { _key: hash, _type: "segment", hash, html: plan.memory.get(hash) ?? s }
      }),
    })
  }

  // Published again while we translated: the next webhook translates the newer version.
  const rev = await client.fetch<string | null>(`*[_id == $id][0]._rev`, { id })
  if (rev !== doc._rev) {
    return { id, status: "aborted", reason: "changed while translating", locales: results() }
  }
  if (writes.length > 0) {
    const tx = client.transaction()
    for (const write of writes) tx.createOrReplace(write as never)
    await tx.commit()
  }
  return { id, status: "done", type: doc._type, locales: results() }
}

/** Removes a document's translations (it was deleted or unpublished). */
export async function deleteTranslations(id: string, client: TranslationClient): Promise<void> {
  await client.delete({ query: `*[_type == "translation" && source._ref == $id]`, params: { id } })
}
