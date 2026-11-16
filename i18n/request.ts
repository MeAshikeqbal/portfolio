import { hasLocale } from "next-intl"
import { getRequestConfig } from "next-intl/server"
import { lang } from "next/root-params"
import { routing } from "./routing"

/**
 * Messages for the current request. Server Components get the locale from the [lang] root param;
 * route handlers (OG images, the homecave snapshot) can't read root params and pass it explicitly
 * via getTranslations({ locale }).
 */
export default getRequestConfig(async ({ locale }) => {
  const requested = locale ?? (await lang())
  const resolved = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale
  return {
    locale: resolved,
    // Every date on the site is formatted in UTC so server and client output match.
    timeZone: "UTC",
    messages: (await import(`../messages/${resolved}.json`)).default,
  }
})
