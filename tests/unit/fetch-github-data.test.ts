import { describe, expect, it } from "vitest"
import { githubPatchFields, normalizeRepoUrl, parseRepoUrl } from "@/lib/fetch-github-data"

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

describe("githubPatchFields", () => {
  const base = {
    stars: 3,
    license: "MIT License",
    language: "Go",
    topics: [],
    pushedAt: "2026-11-01T00:00:00Z",
  }

  it("writes commit activity when GitHub returned it", () => {
    const fields = githubPatchFields({
      ...base,
      activity: { commits: 40, weeklyCommits: [1, 2, 3] },
    })
    expect(fields).toMatchObject({
      "githubData.stars": 3,
      "githubData.commits": 40,
      "githubData.weeklyCommits": [1, 2, 3],
    })
  })

  it("leaves stored commits alone while GitHub is still computing stats", () => {
    const fields = githubPatchFields({ ...base, activity: null })
    expect(fields).toHaveProperty("githubData.stars", 3)
    expect(fields).not.toHaveProperty("githubData.commits")
    expect(fields).not.toHaveProperty("githubData.weeklyCommits")
  })
})
