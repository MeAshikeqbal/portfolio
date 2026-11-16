"use client"

import { Check, Languages } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { DropdownMenu } from "radix-ui"
import type { MouseEvent } from "react"
import { Button } from "@/components/ui/button"
import { localeInfo, localizedPath, locales, type Locale } from "@/i18n/locales"
import { usePathname } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

/**
 * The same page in another language, keeping the query and hash (a filtered post list stays
 * filtered). A full navigation: the root layout (html lang, script font) changes with it.
 */
export function switchLocale(pathname: string, locale: Locale, event?: MouseEvent) {
  event?.preventDefault()
  // A full load on purpose: another locale is another root layout (html lang, fonts, messages).
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(
    `${localizedPath(pathname, locale)}${window.location.search}${window.location.hash}`,
  )
}

/**
 * The language menu: every language in its own name and script. Items are real links (the
 * page's address in each language) so they work without JavaScript and crawlers see them.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("language")
  const current = useLocale()
  const pathname = usePathname()
  if (locales.length < 2) return null

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t("label", { language: localeInfo[current].nativeName })}
          className={cn("gap-1.5 px-2 text-muted-foreground hover:text-foreground", className)}
        >
          <Languages className="size-4" aria-hidden />
          <span className="font-mono text-xs uppercase">{current}</span>
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-44 animate-in rounded-lg border bg-popover p-1 text-popover-foreground shadow-md fade-in-0 zoom-in-95"
        >
          {locales.map((locale) => (
            <DropdownMenu.Item key={locale} asChild>
              <a
                href={localizedPath(pathname, locale)}
                hrefLang={locale}
                lang={locale}
                aria-current={locale === current ? "true" : undefined}
                onClick={(event) => switchLocale(pathname, locale, event)}
                className="flex cursor-pointer items-center justify-between gap-6 rounded-md px-2.5 py-2 text-sm outline-none select-none data-[highlighted]:bg-surface-2"
              >
                {localeInfo[locale].nativeName}
                {locale === current && <Check className="size-3.5" aria-hidden />}
              </a>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

/** The language choice as a plain list, for the mobile menu. */
export function LanguageList({ className }: { className?: string }) {
  const current = useLocale()
  const pathname = usePathname()
  if (locales.length < 2) return null
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {locales.map((locale) => (
        <li key={locale}>
          <a
            href={localizedPath(pathname, locale)}
            hrefLang={locale}
            lang={locale}
            aria-current={locale === current ? "true" : undefined}
            onClick={(event) => switchLocale(pathname, locale, event)}
            className={cn(
              "inline-flex min-h-9 items-center rounded-md border px-2.5 text-sm",
              locale === current
                ? "border-foreground bg-foreground text-background"
                : "text-muted-foreground",
            )}
          >
            {localeInfo[locale].nativeName}
          </a>
        </li>
      ))}
    </ul>
  )
}
