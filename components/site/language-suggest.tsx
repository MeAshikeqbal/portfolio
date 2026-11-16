"use client"

import { useLocale } from "next-intl"
import { useEffect } from "react"
import { toast } from "sonner"
import { isLocale } from "@/i18n/locales"
import { usePathname } from "@/i18n/navigation"
import { switchLocale } from "./language-switcher"

const DISMISSED = "language-suggest-dismissed"

/**
 * Offers the page in the visitor's own language once, as a toast worded in that language: the
 * language their browser asks for, or else the one native to where they are (i18n/hint.ts,
 * asked of /api/language-hint since pages are static). English stays the default and nothing
 * redirects: the visitor chose this URL. Dismissing (or switching) is remembered here.
 */
export function LanguageSuggest() {
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

    const remember = () => {
      try {
        localStorage.setItem(DISMISSED, "1")
      } catch {}
    }
    const controller = new AbortController()
    let id: string | number | undefined
    fetch(`/api/language-hint?current=${current}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((hint: { locale: string | null; message?: string; label?: string } | null) => {
        const locale = hint?.locale
        if (!locale || !isLocale(locale) || !hint.message || !hint.label) return
        id = toast(<span lang={locale}>{hint.message}</span>, {
          duration: 12_000,
          action: {
            label: hint.label,
            onClick: () => {
              remember()
              switchLocale(pathname, locale)
            },
          },
          onDismiss: remember,
        })
      })
      .catch(() => {
        // Offline or aborted: no offer, nothing else changes.
      })
    return () => {
      controller.abort()
      if (id !== undefined) toast.dismiss(id)
    }
    // Once per page load; a client navigation keeps the same locale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  return null
}
