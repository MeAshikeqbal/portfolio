/**
 * Formatting helpers. Dates format in UTC so server and client render the same text
 * (no hydration mismatches across time zones). Every formatter takes the page's locale; numbers
 * always use Latin digits (`-u-nu-latn`) so dashboard figures keep their tabular alignment in
 * Bengali and Hindi too.
 */
type FormatLocale = string

const formatters = new Map<
  string,
  Intl.DateTimeFormat | Intl.NumberFormat | Intl.RelativeTimeFormat
>()

function cached<T extends Intl.DateTimeFormat | Intl.NumberFormat | Intl.RelativeTimeFormat>(
  key: string,
  create: () => T,
): T {
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = create()
    formatters.set(key, formatter)
  }
  return formatter as T
}

const latn = (locale: FormatLocale) => `${locale}-u-nu-latn`

const dateFormat = (locale: FormatLocale) =>
  cached(
    `date:${locale}`,
    () =>
      new Intl.DateTimeFormat(latn(locale), {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
  )

const monthFormat = (locale: FormatLocale) =>
  cached(
    `month:${locale}`,
    () =>
      new Intl.DateTimeFormat(latn(locale), { year: "numeric", month: "short", timeZone: "UTC" }),
  )

const compactFormat = (locale: FormatLocale) =>
  cached(
    `compact:${locale}`,
    () => new Intl.NumberFormat(latn(locale), { notation: "compact", maximumFractionDigits: 1 }),
  )

// "always": "1d ago", never "yesterday", so every age reads as the same kind of figure.
const relativeFormat = (locale: FormatLocale, numeric: "always" | "auto" = "always") =>
  cached(
    `relative:${numeric}:${locale}`,
    () => new Intl.RelativeTimeFormat(latn(locale), { style: "narrow", numeric }),
  )

/** A Date for a valid ISO-ish string, or null for missing or unparseable input. */
export function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

/** "Mar 10, 2026" (in English), or null for missing or invalid dates. */
export function formatDate(
  iso: string | null | undefined,
  locale: FormatLocale = "en",
): string | null {
  const date = parseDate(iso)
  return date ? dateFormat(locale).format(date) : null
}

/** "Mar 2026" (in English), or null for missing or invalid dates. */
export function formatMonth(
  iso: string | null | undefined,
  locale: FormatLocale = "en",
): string | null {
  const date = parseDate(iso)
  return date ? monthFormat(locale).format(date) : null
}

/** 1284 → "1.3K" (in English) */
export function formatCompact(value: number, locale: FormatLocale = "en"): string {
  return compactFormat(locale).format(value)
}

/** 1284 → "1,284" (in English) */
export function formatNumber(value: number, locale: FormatLocale = "en"): string {
  return cached(`number:${locale}`, () => new Intl.NumberFormat(latn(locale))).format(value)
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

/**
 * "just now", "5m ago", "3h ago", "2d ago" or a date past a month (in English; other locales get
 * Intl's narrow relative time); null for invalid input.
 */
export function formatRelative(
  iso: string | null | undefined,
  now: Date = new Date(),
  locale: FormatLocale = "en",
): string | null {
  const date = parseDate(iso)
  if (!date) return null
  const rtf = relativeFormat(locale)
  const minutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000))
  if (minutes < 1) {
    return locale === "en" ? "just now" : relativeFormat(locale, "auto").format(0, "second")
  }
  if (minutes < 60) return rtf.format(-minutes, "minute")
  const hours = Math.round(minutes / 60)
  if (hours < 24) return rtf.format(-hours, "hour")
  const days = Math.round(hours / 24)
  return days <= 30 ? rtf.format(-days, "day") : formatDate(iso, locale)
}

/** GiB as "512 GiB" or "3.6 TiB" (binary units, as ZFS and Proxmox count). */
export function formatBytes(gib: number): string {
  if (!Number.isFinite(gib) || gib < 0) return "—"
  return gib >= 1024 ? `${(gib / 1024).toFixed(1)} TiB` : `${Math.round(gib)} GiB`
}

/** KB/s as "840 KB/s" or "2.4 MB/s". */
export function formatRate(kBps: number): string {
  if (!Number.isFinite(kBps) || kBps < 0) return "—"
  return kBps >= 1024 ? `${(kBps / 1024).toFixed(1)} MB/s` : `${Math.round(kBps)} KB/s`
}

/** 0.997 → "99.7%", 1 → "100%". */
export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—"
  const fixed = value.toFixed(digits)
  return `${fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed}%`
}

const unitFormat = (locale: FormatLocale, unit: "second" | "minute" | "hour" | "day") =>
  cached(
    `unit:${unit}:${locale}`,
    () => new Intl.NumberFormat(latn(locale), { style: "unit", unit, unitDisplay: "short" }),
  )

/**
 * A length of time as one or two units: "45 sec", "12 min", "3 hr 5 min", "2 days 4 hr"
 * (in English; Intl's short units elsewhere).
 */
export function formatDuration(seconds: number, locale: FormatLocale = "en"): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—"
  const s = Math.round(seconds)
  if (s < 60) return unitFormat(locale, "second").format(s)
  const minutes = Math.round(s / 60)
  if (minutes < 60) return unitFormat(locale, "minute").format(minutes)
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours < 48) {
    const h = unitFormat(locale, "hour").format(hours)
    return rest ? `${h} ${unitFormat(locale, "minute").format(rest)}` : h
  }
  const days = Math.floor(hours / 24)
  const restH = hours % 24
  const d = unitFormat(locale, "day").format(days)
  return restH ? `${d} ${unitFormat(locale, "hour").format(restH)}` : d
}
