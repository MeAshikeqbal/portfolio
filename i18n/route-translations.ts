import { createTranslator, type Messages, type NamespaceKeys, type NestedKeyOf } from "next-intl"
import type { Locale } from "./locales"

/**
 * Translations for route handlers and image routes, which can't use next-intl's request config
 * (it reads next/root-params, which only exists for pages and layouts). Same messages, loaded
 * directly for the locale the route got from its params.
 */
export async function routeTranslations<
  Namespace extends NamespaceKeys<Messages, NestedKeyOf<Messages>>,
>(locale: Locale, namespace: Namespace) {
  const messages = (await import(`../messages/${locale}.json`)).default as Messages
  return createTranslator({ locale, messages, namespace, timeZone: "UTC" })
}
