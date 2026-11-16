import type { Metadata } from "next"
import {
  defaultLocale,
  isLocale,
  localeInfo,
  localizedPath,
  locales,
  type Locale,
} from "@/i18n/locales"
import { absoluteUrl, siteConfig } from "@/lib/site"

type OpenGraph = NonNullable<Metadata["openGraph"]>

interface PageMetadataInput {
  title: string
  description: string
  /** Locale-free site path like `/post`; the locale prefix is added here. */
  path: string
  /** The page's locale. */
  locale: Locale
  /**
   * Locales this page exists in. Defaults to every served locale; a post without a translation
   * passes just the English one, so search engines get one canonical copy.
   */
  available?: readonly Locale[]
  /** The site name as the page's language words it (messages: site.siteName). */
  siteName: string
  /** Extra Open Graph fields (e.g. `type: "article"`, `publishedTime`). */
  openGraph?: Partial<OpenGraph>
}

/**
 * The served locales a document can be read in, from a query's `languages` (English plus each
 * machine translation). Translations into a locale the site doesn't serve are left out.
 */
export function servedLanguages(
  languages: readonly (string | null)[] | null | undefined,
): Locale[] {
  const available = new Set((languages ?? []).filter(isLocale))
  available.add(defaultLocale)
  return locales.filter((locale) => available.has(locale))
}

/**
 * Hreflang alternates for a page: one URL per locale it exists in, plus x-default (English).
 * With a single locale there's nothing to point at, so it's left out.
 */
export function languageAlternates(
  path: string,
  available: readonly Locale[] = locales,
): Record<string, string> | undefined {
  if (available.length < 2) return undefined
  return {
    ...Object.fromEntries(available.map((l) => [l, localizedPath(path, l)])),
    "x-default": localizedPath(path, defaultLocale),
  }
}

/**
 * A page's title, description, canonical URL, language alternates and the matching Open Graph
 * and Twitter fields.
 *
 * Next merges `openGraph` and `twitter` shallowly: a page that sets neither inherits the root
 * layout's site-wide title and URL, and a page that sets them drops the root's `siteName` and
 * `locale`. This repeats both. It never sets images: each segment's `opengraph-image.tsx`
 * supplies those, and file-based metadata wins over this object.
 */
export function pageMetadata({
  title,
  description,
  path,
  locale,
  available = locales,
  siteName,
  openGraph,
}: PageMetadataInput): Metadata {
  // A page missing in this locale (shown in English) points search engines at the English copy.
  const canonical = localizedPath(path, available.includes(locale) ? locale : defaultLocale)
  return {
    title,
    description,
    alternates: { canonical, languages: languageAlternates(path, available) },
    openGraph: {
      type: "website",
      locale: localeInfo[locale].ogLocale,
      alternateLocale: available.filter((l) => l !== locale).map((l) => localeInfo[l].ogLocale),
      siteName,
      url: absoluteUrl(canonical),
      title,
      description,
      ...openGraph,
    } as OpenGraph,
    twitter: {
      card: "summary_large_image",
      creator: siteConfig.twitterHandle,
      title,
      description,
    },
  }
}
