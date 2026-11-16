// @vitest-environment node
import { formatHex, parse } from "culori"
import { describe, expect, it } from "vitest"
import { readThemeTokens } from "@/lib/design-tokens"
import { OG_COLORS, OG_STATUS_COLORS } from "@/lib/og"
import { pageMetadata } from "@/lib/metadata"
import { siteConfig } from "@/lib/site"
import { STATUSES } from "@/lib/status"

/** Satori can't read CSS variables, so the share cards carry hex copies of the dark tokens. */
describe("share card colours", () => {
  const { dark } = readThemeTokens()
  const hex = (token: string) => formatHex(parse(dark[token])!)

  it.each([
    ["background", "background"],
    ["surface", "surface"],
    ["foreground", "foreground"],
    ["muted", "muted-foreground"],
    ["border", "border"],
  ] as const)("%s matches the dark --%s token", (key, token) => {
    expect(OG_COLORS[key]).toBe(hex(token))
  })

  it.each(STATUSES)("status %s matches the dark --status-%s token", (status) => {
    expect(OG_STATUS_COLORS[status]).toBe(hex(`status-${status}`))
  })
})

describe("pageMetadata", () => {
  const base = { locale: "en" as const, siteName: `${siteConfig.name} Portfolio` }

  it("prefixes other locales and lists every language it exists in", () => {
    const meta = pageMetadata({
      ...base,
      locale: "hi",
      available: ["en", "hi"],
      title: "x",
      description: "y",
      path: "/now",
    })
    expect(meta.alternates?.canonical).toBe("/hi/now")
    expect(meta.alternates?.languages).toEqual({ en: "/now", hi: "/hi/now", "x-default": "/now" })
    expect(meta.openGraph).toMatchObject({ locale: "hi_IN", alternateLocale: ["en_US"] })
  })

  it("points search engines at English when the page isn't in this language", () => {
    const meta = pageMetadata({
      ...base,
      locale: "de",
      available: ["en"],
      title: "x",
      description: "y",
      path: "/post/a",
    })
    expect(meta.alternates?.canonical).toBe("/post/a")
    expect(meta.alternates?.languages).toBeUndefined()
  })

  it("gives a page its own share title, URL and Twitter card", () => {
    const meta = pageMetadata({ ...base, title: "Now", description: "Doing things.", path: "/now" })
    expect(meta.alternates?.canonical).toBe("/now")
    expect(meta.openGraph).toMatchObject({
      title: "Now",
      description: "Doing things.",
      url: `${siteConfig.url}/now`,
      siteName: `${siteConfig.name} Portfolio`,
      locale: "en_US",
      type: "website",
    })
    expect(meta.twitter).toMatchObject({ card: "summary_large_image", title: "Now" })
  })

  it("never sets images (each segment's opengraph-image supplies them)", () => {
    const meta = pageMetadata({ ...base, title: "x", description: "y", path: "/x" })
    expect(meta.openGraph).not.toHaveProperty("images")
    expect(meta.twitter).not.toHaveProperty("images")
  })

  it("lets article pages add their own Open Graph fields", () => {
    const meta = pageMetadata({
      ...base,
      title: "Post",
      description: "d",
      path: "/post/a",
      openGraph: { type: "article", publishedTime: "2026-01-01" },
    })
    expect(meta.openGraph).toMatchObject({ type: "article", publishedTime: "2026-01-01" })
  })
})
