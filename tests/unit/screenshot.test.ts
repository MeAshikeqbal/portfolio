import { describe, expect, it } from "vitest"
import { screenshotUrl } from "@/lib/screenshot"

describe("screenshotUrl", () => {
  it("builds a thum.io URL for http(s) targets", () => {
    expect(screenshotUrl("https://example.com/", 896, 560)).toBe(
      "https://image.thum.io/get/noanimate/viewportWidth/1280/width/1792/crop/800/https://example.com/",
    )
  })

  it("keeps a hash route by encoding the fragment", () => {
    const url = screenshotUrl("https://example.com/#/dashboard", 896, 560)
    expect(url).toMatch(/https:\/\/example\.com\/%23\/dashboard$/)
    expect(new URL(url!).hash).toBe("")
  })

  it.each(["mailto:me@example.com", "/relative", "not a url", "javascript:alert(1)"])(
    "returns null for %s",
    (url) => {
      expect(screenshotUrl(url, 896, 560)).toBeNull()
    },
  )
})
