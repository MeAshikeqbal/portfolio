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
 * Whether a free-text period like "2022 - 2026", "2026" or "2024 – present" is ongoing.
 * - "present" / "now" / "current" are ongoing.
 * - A single year ("2026") is a start: ongoing from that year on.
 * - A range ends at its last year, so it's ongoing only while that year is still ahead.
 *   "2022 - 2026" stops counting as current once 2026 arrives: a finished degree must not
 *   keep a green "current" dot all year (write "2022 – present" if it's still running).
 */
export function isCurrentPeriod(period: string | null | undefined, now = new Date()): boolean {
  if (!period) return false
  if (/\b(present|now|current)\b/i.test(period)) return true
  const years = period.match(/\d{4}/g)
  if (!years) return false
  const last = Number(years[years.length - 1])
  const year = now.getUTCFullYear()
  return years.length === 1 ? last >= year : last > year
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

/** "just now", "5m ago", "3h ago", "2d ago" or a date past a month; null for invalid input. */
export function formatRelative(
  iso: string | null | undefined,
  now: Date = new Date(),
): string | null {
  const date = parseDate(iso)
  if (!date) return null
  const minutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000))
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return days <= 30 ? `${days}d ago` : formatDate(iso)
}
