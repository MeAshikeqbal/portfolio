import {
  Geist,
  Geist_Mono,
  Noto_Sans_Bengali,
  Noto_Sans_Devanagari,
  Noto_Sans_JP,
} from "next/font/google"
import type { LocaleInfo } from "@/i18n/locales"

/** Shared by every root layout ([lang], studio) and the global 404. */
export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
})

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${geistSans.variable} ${geistMono.variable}`

/*
 * Scripts Geist doesn't cover, each behind the same --font-script variable (app/globals.css puts
 * it after Geist, so Latin text, digits and code stay in Geist). Only the page's own script is
 * applied, and none is preloaded: a page in English never downloads them.
 */
const devanagari = Noto_Sans_Devanagari({
  variable: "--font-script",
  subsets: ["devanagari"],
  display: "swap",
  preload: false,
})

const bengali = Noto_Sans_Bengali({
  variable: "--font-script",
  subsets: ["bengali"],
  display: "swap",
  preload: false,
})

// Japanese comes in many small unicode-range slices, so only the characters used are fetched.
const japanese = Noto_Sans_JP({
  variable: "--font-script",
  display: "swap",
  preload: false,
})

const SCRIPT_FONTS: Record<NonNullable<LocaleInfo["script"]>, string> = {
  devanagari: devanagari.variable,
  bengali: bengali.variable,
  japanese: japanese.variable,
}

/** The font variables for a locale's <html>: Geist, plus its script font when it needs one. */
export function localeFontVariables(script: LocaleInfo["script"]): string {
  return script ? `${fontVariables} ${SCRIPT_FONTS[script]}` : fontVariables
}
