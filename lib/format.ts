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

/** "Mar 10, 2026" */
export function formatDate(iso: string | null | undefined): string | null {
  return iso ? dateFormat.format(new Date(iso)) : null
}

/** "Mar 2026" */
export function formatMonth(iso: string | null | undefined): string | null {
  return iso ? monthFormat.format(new Date(iso)) : null
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
  if (/present|now|current/i.test(period)) return true
  const years = period.match(/\d{4}/g)
  return years ? Number(years[years.length - 1]) >= now.getUTCFullYear() : false
}
