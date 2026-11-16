import { defaultLocale, isLocale, locales, type Locale } from "./locales"

/** The params every image under app/[lang] receives. */
export type OgParams = Promise<{ lang: string }>

/**
 * The locale of an Open Graph image. Image routes run like route handlers, which can't read
 * next/root-params, so they take it from their params and pass it to getTranslations.
 */
export async function ogLocale(params: Promise<{ lang: string }>): Promise<Locale> {
  const { lang } = await params
  return isLocale(lang) ? lang : defaultLocale
}

/** Prerender an image route once per served locale (it sits under the dynamic [lang] segment). */
export function ogStaticParams() {
  return locales.map((lang) => ({ lang }))
}
