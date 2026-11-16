import { NO_TRANSLATE } from "../../i18n/no-translate"

/**
 * Text ↔ the HTML sent to Google Translate. Names in i18n/no-translate.ts are wrapped in
 * `translate="no"` spans so Google copies them as they are.
 */

export const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

export const decodeHtml = (text: string) =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&")

const NO_TRANSLATE_PATTERN = new RegExp(
  `\\b(${[...NO_TRANSLATE]
    .sort((a, b) => b.length - a.length)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})\\b`,
  "g",
)

/** Plain text as HTML for the translator, protected names wrapped. */
export function textHtml(text: string): string {
  return escapeHtml(text).replace(NO_TRANSLATE_PATTERN, '<span translate="no">$1</span>')
}

/** The translator's HTML back to plain text: markup dropped, entities decoded. */
export function htmlText(html: string): string {
  return decodeHtml(html.replace(/<[^>]+>/g, ""))
}
