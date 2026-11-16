/**
 * Supported locales and their per-language settings. English is the source language: its URLs
 * stay unprefixed (/post/foo) and every other locale lives under a prefix (/hi/post/foo).
 * Plain data with no Next.js imports, so the proxy, scripts and tests can all read it.
 */
export const allLocales = ["en", "hi", "bn", "tl", "es", "de", "ja"] as const

export type Locale = (typeof allLocales)[number]

/**
 * The locales the site serves. A locale goes live here once messages/<locale>.json exists
 * (npm run i18n:translate); until then its URLs 404.
 */
export const locales: readonly Locale[] = ["en"]

export const defaultLocale: Locale = "en"

export type LocaleInfo = {
  /** The language's own name, shown in the switcher. */
  nativeName: string
  /** English name, for logs and the Studio. */
  englishName: string
  /** Open Graph locale (language_TERRITORY). */
  ogLocale: string
  /** Script font loaded on top of Geist for scripts it doesn't cover; null = Latin only. */
  script: "devanagari" | "bengali" | "japanese" | null
  /** Text without spaces between words: reading time counts characters instead of words. */
  countsCharacters: boolean
}

export const localeInfo: Record<Locale, LocaleInfo> = {
  en: {
    nativeName: "English",
    englishName: "English",
    ogLocale: "en_US",
    script: null,
    countsCharacters: false,
  },
  hi: {
    nativeName: "हिन्दी",
    englishName: "Hindi",
    ogLocale: "hi_IN",
    script: "devanagari",
    countsCharacters: false,
  },
  bn: {
    nativeName: "বাংলা",
    englishName: "Bengali",
    ogLocale: "bn_IN",
    script: "bengali",
    countsCharacters: false,
  },
  tl: {
    nativeName: "Tagalog",
    englishName: "Tagalog",
    ogLocale: "tl_PH",
    script: null,
    countsCharacters: false,
  },
  es: {
    nativeName: "Español",
    englishName: "Spanish",
    ogLocale: "es_ES",
    script: null,
    countsCharacters: false,
  },
  de: {
    nativeName: "Deutsch",
    englishName: "German",
    ogLocale: "de_DE",
    script: null,
    countsCharacters: false,
  },
  ja: {
    nativeName: "日本語",
    englishName: "Japanese",
    ogLocale: "ja_JP",
    script: "japanese",
    countsCharacters: true,
  },
}

/** Whether `value` is a locale the site serves. */
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value)
}

/** The public path for `path` in `locale`: English unprefixed, others under /<locale>. */
export function localizedPath(path: string, locale: Locale | string): string {
  if (locale === defaultLocale) return path
  return path === "/" ? `/${locale}` : `/${locale}${path}`
}
