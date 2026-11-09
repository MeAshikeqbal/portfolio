// @vitest-environment node
import { describe, expect, it } from "vitest"
import { highlight, resolveLanguage } from "@/lib/highlight"

describe("resolveLanguage", () => {
  it.each([
    ["javascript", "javascript"],
    ["JS", "javascript"],
    ["sh", "bash"],
    ["html", "html"],
    [null, "text"],
    ["not-a-language", "text"],
  ])("%j → %s", (input, expected) => {
    expect(resolveLanguage(input)).toBe(expected)
  })
})

describe("highlight", () => {
  it("emits dual-theme CSS variables and escapes the code", async () => {
    const html = await highlight('const x = "<script>"', "js")
    expect(html).toContain("--shiki-light")
    expect(html).toContain("--shiki-dark")
    expect(html).not.toContain("<script>")
  })
})
