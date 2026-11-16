"use client"

import { Check, ChevronDown, Languages } from "lucide-react"
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

/**
 * The language choice for the mobile menu: a native select, so the phone shows its own picker,
 * one row high like the theme toggle beside it.
 */
export function LanguageSelect({ id, className }: { id?: string; className?: string }) {
  const current = useLocale()
  const pathname = usePathname()
  if (locales.length < 2) return null
  return (
    <span className={cn("relative inline-flex", className)}>
      <select
        id={id}
        value={current}
        onChange={(event) => switchLocale(pathname, event.target.value as Locale)}
        className="h-8 appearance-none rounded-md border bg-transparent py-0 pr-8 pl-2.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {locales.map((locale) => (
          <option key={locale} value={locale} lang={locale}>
            {localeInfo[locale].nativeName}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
    </span>
  )
}
