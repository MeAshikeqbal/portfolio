import { NextResponse, type NextRequest } from "next/server"
import { acceptedLanguages, languageHint } from "@/i18n/hint"
import { isLocale, localeInfo } from "@/i18n/locales"
import { routeTranslations } from "@/i18n/route-translations"

/**
 * Which language to offer this visitor (i18n/hint.ts), with the offer worded in that language.
 * Pages are static, so they ask here once: Vercel adds the visitor's country and region to the
 * request. Nothing is stored or logged, and the answer is never cached.
 *
 * GET /api/language-hint?current=en → { locale: "hi", message: "यह पृष्ठ हिन्दी में…", label: "हिन्दी" }
 */
export async function GET(request: NextRequest) {
  const current = request.nextUrl.searchParams.get("current") ?? ""
  const headers = request.headers
  const locale = isLocale(current)
    ? languageHint({
        current,
        languages: acceptedLanguages(headers.get("accept-language")),
        country: headers.get("x-vercel-ip-country"),
        region: headers.get("x-vercel-ip-country-region"),
      })
    : null

  let body: { locale: string | null; message?: string; label?: string } = { locale: null }
  if (locale) {
    const t = await routeTranslations(locale, "language")
    const label = localeInfo[locale].nativeName
    body = { locale, message: t("available", { language: label }), label }
  }
  return NextResponse.json(body, { headers: { "cache-control": "private, no-store" } })
}
