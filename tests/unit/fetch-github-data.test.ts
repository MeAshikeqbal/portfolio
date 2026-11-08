import { describe, expect, it } from "vitest"
import { normalizeRepoUrl, parseRepoUrl } from "@/lib/fetch-github-data"

describe("parseRepoUrl", () => {
  it.each([
    ["https://github.com/MeAshikeqbal/portfolio", { owner: "MeAshikeqbal", repo: "portfolio" }],
    ["https://github.com/MeAshikeqbal/portfolio/", { owner: "MeAshikeqbal", repo: "portfolio" }],
    ["https://github.com/MeAshikeqbal/portfolio.git", { owner: "MeAshikeqbal", repo: "portfolio" }],
    [
      "https://www.github.com/MeAshikeqbal/portfolio/tree/master",
      { owner: "MeAshikeqbal", repo: "portfolio" },
    ],
  ])("parses %s", (url, expected) => {
    expect(parseRepoUrl(url)).toEqual(expected)
  })

  it.each(["https://gitlab.com/a/b", "https://github.com/only-owner", "not a url", ""])(
    "rejects %j",
    (url) => {
      expect(parseRepoUrl(url)).toBeNull()
    },
  )
})

describe("normalizeRepoUrl", () => {
  it("treats case, trailing slashes and .git as the same repo", () => {
    const canonical = normalizeRepoUrl("https://github.com/meashikeqbal/portfolio")
    expect(normalizeRepoUrl("https://github.com/MeAshikeqbal/Portfolio/")).toBe(canonical)
    expect(normalizeRepoUrl("https://github.com/MeAshikeqbal/portfolio.git")).toBe(canonical)
  })
})
