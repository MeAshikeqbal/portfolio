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
  it("gives a page its own share title, URL and Twitter card", () => {
    const meta = pageMetadata({ title: "Now", description: "Doing things.", path: "/now" })
    expect(meta.alternates?.canonical).toBe("/now")
    expect(meta.openGraph).toMatchObject({
      title: "Now",
      description: "Doing things.",
      url: `${siteConfig.url}/now`,
      siteName: `${siteConfig.name} Portfolio`,
      locale: siteConfig.locale,
      type: "website",
    })
    expect(meta.twitter).toMatchObject({ card: "summary_large_image", title: "Now" })
  })

  it("never sets images (each segment's opengraph-image supplies them)", () => {
    const meta = pageMetadata({ title: "x", description: "y", path: "/x" })
    expect(meta.openGraph).not.toHaveProperty("images")
    expect(meta.twitter).not.toHaveProperty("images")
  })

  it("lets article pages add their own Open Graph fields", () => {
    const meta = pageMetadata({
      title: "Post",
      description: "d",
      path: "/post/a",
      openGraph: { type: "article", publishedTime: "2026-01-01" },
    })
    expect(meta.openGraph).toMatchObject({ type: "article", publishedTime: "2026-01-01" })
  })
})
