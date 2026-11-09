/**
 * Formatting helpers. Dates format in UTC so server and client render the same text
 * (no hydration mismatches across time zones).
 */
const dateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

const monthFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  timeZone: "UTC",
})

const compactFormat = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

/** A Date for a valid ISO-ish string, or null for missing or unparseable input. */
export function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

/** "Mar 10, 2026", or null for missing or invalid dates. */
export function formatDate(iso: string | null | undefined): string | null {
  const date = parseDate(iso)
  return date ? dateFormat.format(date) : null
}

/** "Mar 2026", or null for missing or invalid dates. */
export function formatMonth(iso: string | null | undefined): string | null {
  const date = parseDate(iso)
  return date ? monthFormat.format(date) : null
}

/** 1284 → "1.3K" */
export function formatCompact(value: number): string {
  return compactFormat.format(value)
}

/**
 * Whether a free-text period like "2022 - 2026", "2026" or "2024 – present" is ongoing,
 * judged by its last year (or the word "present") against `now`.
 */
export function isCurrentPeriod(period: string | null | undefined, now = new Date()): boolean {
  if (!period) return false
  if (/\b(present|now|current)\b/i.test(period)) return true
  const years = period.match(/\d{4}/g)
  return years ? Number(years[years.length - 1]) >= now.getUTCFullYear() : false
}

/**
 * Shortens text to at most `max` characters on a word boundary, adding an ellipsis, so
 * excerpts never stop mid-word.
 */
export function trimText(text: string | null | undefined, max: number): string | null {
  if (!text) return null
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const space = cut.lastIndexOf(" ")
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?-]+$/, "")}…`
}
