import { defaultLocale, isLocale, type Locale } from "./locales"

/**
 * Which language to offer a visitor, from their browser's languages and where they are.
 * English stays the default: this only ever suggests (components/site/language-suggest.tsx),
 * never redirects.
 */

/** Countries whose main language the site speaks. */
const COUNTRY_LOCALE: Record<string, Locale> = {
  JP: "ja",
  DE: "de",
  AT: "de",
  LI: "de",
  BD: "bn",
  PH: "tl",
  ...Object.fromEntries(
    // Spain and the Spanish-speaking Americas and Africa.
    [
      "ES",
      "MX",
      "AR",
      "CO",
      "CL",
      "PE",
      "VE",
      "EC",
      "GT",
      "CU",
      "BO",
      "DO",
      "HN",
      "PY",
      "SV",
      "NI",
      "CR",
      "PA",
      "UY",
      "PR",
      "GQ",
    ].map((country) => [country, "es" as const]),
  ),
}

/**
 * India has no single language: Bengali in West Bengal and Tripura, Hindi across the Hindi
 * belt (ISO 3166-2 codes, old and new spellings), and no suggestion elsewhere, where English
 * is the safer default.
 */
const INDIA_REGION_LOCALE: Record<string, Locale> = {
  WB: "bn",
  TR: "bn",
  ...Object.fromEntries(
    ["UP", "BR", "DL", "RJ", "MP", "HR", "HP", "UK", "UT", "JH", "CG", "CT", "CH"].map((region) => [
      region,
      "hi" as const,
    ]),
  ),
}

/** The native language of where a visitor is, if the site speaks it. */
export function locationLocale(
  country: string | null | undefined,
  region: string | null | undefined,
): Locale | null {
  const code = country?.toUpperCase()
  if (!code) return null
  const locale =
    code === "IN" ? INDIA_REGION_LOCALE[region?.toUpperCase() ?? ""] : COUNTRY_LOCALE[code]
  return locale && isLocale(locale) ? locale : null
}

/** The browser's languages, most preferred first, from an Accept-Language header. */
export function acceptedLanguages(header: string | null | undefined): string[] {
  return (header ?? "")
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";")
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="))
      return { tag: tag.toLowerCase(), q: q ? Number(q.slice(2)) : 1, index }
    })
    .filter((entry) => entry.tag && entry.tag !== "*" && entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map((entry) => entry.tag)
}

/** The first browser language the site speaks (Filipino reads Tagalog). */
export function browserLocale(languages: readonly string[]): Locale | null {
  for (const tag of languages) {
    const language = tag.toLowerCase().split("-")[0]
    const locale = language === "fil" ? "tl" : language
    if (isLocale(locale)) return locale
  }
  return null
}

/**
 * The language to offer on a page in `current`, or null:
 * 1. a language other than English the browser asks for (the reader chose it);
 * 2. the native language of where they are, when the page isn't in it already;
 * 3. English, for an English reader who landed on a translated page.
 */
export function languageHint({
  current,
  languages,
  country,
  region,
}: {
  current: string
  languages: readonly string[]
  country?: string | null
  region?: string | null
}): Locale | null {
  const browser = browserLocale(languages)
  if (browser && browser !== defaultLocale) return browser === current ? null : browser
  const native = locationLocale(country, region)
  if (native && native !== current) return native
  if (browser === defaultLocale && current !== defaultLocale && !native) return defaultLocale
  return null
}
