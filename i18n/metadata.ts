import { lang } from "next/root-params"
import { getTranslations } from "next-intl/server"
import { pageMetadata } from "@/lib/metadata"
import { siteConfig } from "@/lib/site"
import { defaultLocale, isLocale, type Locale } from "./locales"

/** The current request's locale, from the [lang] root param (Server Components only). */
export async function currentLocale(): Promise<Locale> {
  const value = await lang()
  return isLocale(value) ? value : defaultLocale
}

/** pageMetadata for the current locale, with the localized site name filled in. */
export async function localizedPageMetadata(
  input: Omit<Parameters<typeof pageMetadata>[0], "locale" | "siteName">,
) {
  const [locale, site] = await Promise.all([currentLocale(), getTranslations("site")])
  return pageMetadata({ ...input, locale, siteName: site("siteName", { name: siteConfig.name }) })
}
