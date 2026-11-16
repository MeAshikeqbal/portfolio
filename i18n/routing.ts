import { defineRouting } from "next-intl/routing"
import { defaultLocale, locales } from "./locales"

/**
 * Locale routing, shared by the proxy and the navigation helpers (i18n/navigation.ts). Kept free
 * of navigation imports: the proxy can't load the request config they pull in.
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  // English keeps its existing unprefixed URLs; /en/... redirects to them.
  localePrefix: "as-needed",
  // The browser language only suggests a switch (components/site/language-suggest.tsx), so no
  // cookie or Accept-Language redirect. Hreflang comes from page metadata, not a Link header.
  localeDetection: false,
  alternateLinks: false,
})
