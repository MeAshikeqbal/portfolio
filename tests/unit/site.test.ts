import { describe, expect, it } from "vitest"
import { absoluteUrl, siteConfig } from "@/lib/site"

describe("absoluteUrl", () => {
  it("resolves paths against the canonical www domain", () => {
    expect(absoluteUrl("/post/hello")).toBe("https://www.itsashik.dev/post/hello")
  })

  it("defaults to the site root", () => {
    expect(absoluteUrl()).toBe(`${siteConfig.url}/`)
  })
})
