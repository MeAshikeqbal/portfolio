import { Languages } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { defaultLocale, localizedPath } from "@/i18n/locales"
import { cn } from "@/lib/utils"

/**
 * Says that the page's text was machine-translated from English, and links to the original.
 * Renders nothing on English pages. `path` is the page's locale-free path.
 */
export function TranslationNotice({
  path,
  scope = "page",
  className,
}: {
  path: string
  /**
   * "page": the interface around it. "content": the article below, machine-translated.
   * "english": the article below, still in English only.
   */
  scope?: "page" | "content" | "english"
  className?: string
}) {
  const t = useTranslations("language")
  const locale = useLocale()
  if (locale === defaultLocale) return null

  if (scope === "english") {
    return (
      <p
        lang={locale}
        className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}
      >
        <Languages className="size-3.5 shrink-0" aria-hidden />
        {t("contentEnglish")}
      </p>
    )
  }

  return (
    <p className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <Languages className="size-3.5 shrink-0" aria-hidden />
      <span>
        {scope === "content" ? t("contentNotice") : t("pageNotice")}{" "}
        <a
          href={localizedPath(path, defaultLocale)}
          hrefLang={defaultLocale}
          lang={defaultLocale}
          className="underline decoration-border underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
        >
          {t("original")}
        </a>
      </span>
    </p>
  )
}
