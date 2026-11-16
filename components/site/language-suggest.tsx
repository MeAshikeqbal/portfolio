"use client"

import { useLocale, useTranslations } from "next-intl"
import { useEffect } from "react"
import { toast } from "sonner"
import { isLocale, localeInfo, type Locale } from "@/i18n/locales"
import { usePathname } from "@/i18n/navigation"
import { switchLocale } from "./language-switcher"

const DISMISSED = "language-suggest-dismissed"

/** The first of the browser's languages the site speaks, if it isn't the page's. */
export function suggestedLocale(preferred: readonly string[], current: string): Locale | null {
  for (const tag of preferred) {
    const language = tag.toLowerCase().split("-")[0]
    // Filipino (fil) reads Tagalog.
    const locale = language === "fil" ? "tl" : language
    if (locale === current) return null
    if (isLocale(locale)) return locale
  }
  return null
}

/**
 * Offers the page in the visitor's language once, as a toast, when their browser prefers a
 * language the site speaks and this page is in another. Never redirects: the visitor chose
 * this URL. Dismissing (or switching) is remembered in this browser.
 */
export function LanguageSuggest() {
  const t = useTranslations("language")
  const current = useLocale()
  const pathname = usePathname()

  useEffect(() => {
    let dismissed = false
    try {
      dismissed = localStorage.getItem(DISMISSED) === "1"
    } catch {
      // Storage can be blocked; then the toast may show again, which is harmless.
    }
    if (dismissed) return
    const locale = suggestedLocale(navigator.languages ?? [navigator.language], current)
    if (!locale) return

    const remember = () => {
      try {
        localStorage.setItem(DISMISSED, "1")
      } catch {}
    }
    const name = localeInfo[locale].nativeName
    const id = toast(t("available", { language: name }), {
      duration: 12_000,
      action: {
        label: name,
        onClick: () => {
          remember()
          switchLocale(pathname, locale)
        },
      },
      onDismiss: remember,
    })
    return () => {
      toast.dismiss(id)
    }
    // Once per page load; a client navigation keeps the same locale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  return null
}
