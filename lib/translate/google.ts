/**
 * Google Cloud Translation (v2, "Basic") over REST, batched. Used by the UI messages script
 * (scripts/translate-messages.ts) and the Sanity content translator. Sends HTML so markup the
 * callers add (placeholders, `translate="no"` spans) survives the round trip.
 */
const ENDPOINT = "https://translation.googleapis.com/language/translate/v2"
/** Google's limits are 128 segments and about 30k characters per request; stay under both. */
const MAX_SEGMENTS = 100
const MAX_CHARS = 25_000
const RETRIES = 4

export interface TranslateOptions {
  apiKey: string
  /** Target language (Google code: "hi", "bn", "tl", "es", "de", "ja"). */
  target: string
  source?: string
  fetch?: typeof fetch
  /** Wait between retries; overridable for tests. */
  sleep?: (ms: number) => Promise<void>
}

/** Batches of segments that each fit one request. */
export function batches(segments: readonly string[]): string[][] {
  const out: string[][] = []
  let current: string[] = []
  let chars = 0
  for (const segment of segments) {
    if (current.length > 0 && (current.length >= MAX_SEGMENTS || chars + segment.length > MAX_CHARS)) {
      out.push(current)
      current = []
      chars = 0
    }
    current.push(segment)
    chars += segment.length
  }
  if (current.length > 0) out.push(current)
  return out
}

/** Translates HTML segments, in order. Duplicates are sent once. */
export async function translateHtml(
  segments: readonly string[],
  { apiKey, target, source = "en", fetch: fetchImpl = fetch, sleep = defaultSleep }: TranslateOptions,
): Promise<string[]> {
  const unique = [...new Set(segments)]
  const translated = new Map<string, string>()
  for (const batch of batches(unique)) {
    const result = await request(batch, { apiKey, target, source, fetchImpl, sleep })
    batch.forEach((segment, i) => translated.set(segment, result[i]))
  }
  return segments.map((segment) => translated.get(segment)!)
}

async function request(
  q: string[],
  opts: { apiKey: string; target: string; source: string; fetchImpl: typeof fetch; sleep: (ms: number) => Promise<void> },
): Promise<string[]> {
  for (let attempt = 0; ; attempt++) {
    const response = await opts.fetchImpl(`${ENDPOINT}?key=${encodeURIComponent(opts.apiKey)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ q, target: opts.target, source: opts.source, format: "html" }),
    })
    if (response.ok) {
      const body = (await response.json()) as {
        data?: { translations?: { translatedText: string }[] }
      }
      const translations = body.data?.translations ?? []
      if (translations.length !== q.length) {
        throw new Error(`Google returned ${translations.length} translations for ${q.length} segments`)
      }
      return translations.map((t) => t.translatedText)
    }
    // Rate limits and server errors are worth retrying; bad keys and requests are not.
    const retryable = response.status === 429 || response.status >= 500
    if (!retryable || attempt >= RETRIES) {
      const detail = await response.text().catch(() => "")
      throw new Error(`Google Translate ${response.status}: ${detail.slice(0, 300)}`)
    }
    await opts.sleep(500 * 2 ** attempt)
  }
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
