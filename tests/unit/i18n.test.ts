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

describe("suggestedLocale", () => {
  it("offers the first browser language the site speaks, unless the page is already in it", async () => {
    const { suggestedLocale } = await import("@/components/site/language-suggest")
    expect(suggestedLocale(["fr-FR", "en-GB"], "ja")).toBe("en")
    expect(suggestedLocale(["en-US", "ja"], "en")).toBeNull()
    expect(suggestedLocale(["fr", "pt"], "en")).toBeNull()
  })
})

describe("OG script characters", () => {
  it("keeps only what Geist can't draw, from any string in the image", async () => {
    const { scriptCharacters } = await import("@/lib/og")
    const chars = scriptCharacters([{ title: "ホーム · 2026年", footer: ["Proxmox — 3"] }])
    expect([...chars].sort()).toEqual([..."ホーム年"].sort())
  })
})
