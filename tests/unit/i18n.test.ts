import { revalidatePath } from "next/cache"
import { describe, expect, it, vi } from "vitest"
import { defaultLocale, isLocale, localizedPath, locales } from "@/i18n/locales"
import { formatDate, formatRelative } from "@/lib/format"
import { revalidatePages } from "@/lib/revalidate"
import { siteConfig } from "@/lib/site"
import { englishT } from "./intl"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

describe("locales", () => {
  it("serves English, unprefixed", () => {
    expect(defaultLocale).toBe("en")
    expect(locales).toContain("en")
    expect(localizedPath("/post/a", "en")).toBe("/post/a")
    expect(localizedPath("/", "en")).toBe("/")
  })

  it("prefixes every other locale", () => {
    expect(localizedPath("/post/a", "hi")).toBe("/hi/post/a")
    expect(localizedPath("/", "ja")).toBe("/ja")
  })

  it("only accepts locales the site serves", () => {
    expect(isLocale("en")).toBe(true)
    expect(isLocale("xx")).toBe(false)
    expect(isLocale(undefined)).toBe(false)
  })
})

describe("English site copy", () => {
  // The RSS feed, manifest and the signed identity statement read siteConfig; pages read the
  // messages. Both must say the same thing in English.
  it("matches siteConfig", () => {
    const t = englishT("site")
    expect(t("description", { name: siteConfig.name })).toBe(siteConfig.description)
    expect(t("title", { name: siteConfig.name })).toBe(siteConfig.title)
    expect(t("tagline")).toBe(siteConfig.tagline)
    expect(t("role")).toBe(siteConfig.role)
  })
})

describe("locale-aware formatting", () => {
  const now = new Date("2026-03-10T12:00:00Z")

  it("keeps the English forms", () => {
    expect(formatDate("2026-03-10T00:00:00Z")).toBe("Mar 10, 2026")
    expect(formatRelative("2026-03-10T11:59:40Z", now)).toBe("just now")
    expect(formatRelative("2026-03-10T10:00:00Z", now)).toBe("2h ago")
    expect(formatRelative("2026-03-09T12:00:00Z", now)).toBe("1d ago")
  })

  it("formats other languages with Latin digits", () => {
    expect(formatDate("2026-03-10T00:00:00Z", "ja")).toBe("2026年3月10日")
    // Bengali defaults to Bengali digits; dashboards keep 0-9 for tabular alignment.
    expect(formatRelative("2026-03-10T10:00:00Z", now, "bn")).toMatch(/^2 /)
  })
})

describe("revalidatePages", () => {
  it("revalidates a page in every language through its [lang] route", () => {
    revalidatePages("/", "/post/[slug]")
    expect(revalidatePath).toHaveBeenCalledWith("/[lang]", "page")
    expect(revalidatePath).toHaveBeenCalledWith("/[lang]/post/[slug]", "page")
  })
})

describe("language hint", () => {
  it("reads Accept-Language in order of preference", async () => {
    const { acceptedLanguages } = await import("@/i18n/hint")
    expect(acceptedLanguages("en-US,en;q=0.9,hi;q=0.95,*;q=0.1")).toEqual(["en-us", "hi", "en"])
    expect(acceptedLanguages(null)).toEqual([])
  })

  it("maps where a visitor is to the language native there", async () => {
    const { locationLocale } = await import("@/i18n/hint")
    expect(locationLocale("JP", null)).toBe("ja")
    expect(locationLocale("mx", "CMX")).toBe("es")
    expect(locationLocale("BD", "13")).toBe("bn")
    expect(locationLocale("IN", "WB")).toBe("bn")
    expect(locationLocale("IN", "UP")).toBe("hi")
    // English is the safer default across the rest of India, and elsewhere.
    expect(locationLocale("IN", "TN")).toBeNull()
    expect(locationLocale("US", "CA")).toBeNull()
    expect(locationLocale(null, null)).toBeNull()
  })

  it("offers the browser's language first, then the local one, and keeps English the default", async () => {
    const { languageHint } = await import("@/i18n/hint")
    // An English browser in Delhi, on the English site: offer Hindi.
    expect(languageHint({ current: "en", languages: ["en-us"], country: "IN", region: "DL" })).toBe(
      "hi",
    )
    // The browser asks for Japanese: that wins over where they are.
    expect(languageHint({ current: "en", languages: ["ja"], country: "DE" })).toBe("ja")
    // Already reading in their language: nothing.
    expect(languageHint({ current: "ja", languages: ["ja"], country: "JP" })).toBeNull()
    expect(languageHint({ current: "ja", languages: ["en"], country: "JP" })).toBeNull()
    // An English reader abroad from anywhere without a site language, on a translated page.
    expect(languageHint({ current: "de", languages: ["en-gb"], country: "GB" })).toBe("en")
    // An English reader at home on the English site: nothing.
    expect(languageHint({ current: "en", languages: ["en-us"], country: "US" })).toBeNull()
    // Filipino browsers read Tagalog.
    expect(languageHint({ current: "en", languages: ["fil-ph"] })).toBe("tl")
  })

  it("answers with the offer worded in the suggested language, never cached", async () => {
    const { GET } = await import("@/app/api/language-hint/route")
    const { NextRequest } = await import("next/server")
    const response = await GET(
      new NextRequest("http://localhost/api/language-hint?current=en", {
        headers: { "accept-language": "en-US", "x-vercel-ip-country": "JP" },
      }),
    )
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    const body = await response.json()
    expect(body.locale).toBe("ja")
    expect(body.label).toBe("日本語")
    expect(body.message).toContain("日本語")
    expect(body.message).not.toBe("This page is available in 日本語.")
  })
})

describe("OG script characters", () => {
  it("keeps only what Geist can't draw, from any string in the image", async () => {
    const { scriptCharacters } = await import("@/lib/og")
    const chars = scriptCharacters([{ title: "ホーム · 2026年", footer: ["Proxmox — 3"] }])
    expect([...chars].sort()).toEqual([..."ホーム年"].sort())
  })
})
