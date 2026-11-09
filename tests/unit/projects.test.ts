import { describe, expect, it } from "vitest"
import type { Project } from "@/lib/api"
import { projectHref, projectMeta, projectTags, shortLicense } from "@/lib/projects"

function project(overrides: Partial<Project> = {}): Project {
  return {
    _id: "p1",
    title: "demo",
    slug: null,
    description: null,
    mainImage: null,
    publishedAt: null,
    github: null,
    url: null,
    featured: null,
    status: null,
    tech: null,
    githubData: null,
    ...overrides,
  } as Project
}

describe("projectMeta", () => {
  it("lists only facts that have values, hiding zero stars", () => {
    const meta = projectMeta(
      project({
        githubData: {
          stars: 0,
          commits: 42,
          language: "Go",
          pushedAt: "2026-03-01T00:00:00Z",
        } as Project["githubData"],
      }),
    )
    expect(meta).toEqual(["Go", "42 commits", "pushed Mar 2026"])
  })

  it("is empty without GitHub data", () => {
    expect(projectMeta(project())).toEqual([])
  })
})

describe("projectHref", () => {
  it("prefers the case study, then the live site, then the repo", () => {
    expect(
      projectHref({ slug: "demo", url: "https://x.dev", github: "https://github.com/a/b" }),
    ).toBe("/projects/demo")
    expect(
      projectHref({ slug: null, url: "https://x.dev", github: "https://github.com/a/b" }),
    ).toBe("https://x.dev")
    expect(projectHref({ slug: null, url: "", github: "https://github.com/a/b" })).toBe(
      "https://github.com/a/b",
    )
    expect(projectHref({ slug: null, url: null, github: null })).toBeUndefined()
  })
})

describe("projectTags", () => {
  it("merges the GitHub language with tech tags without duplicates", () => {
    const tags = projectTags(
      project({
        tech: ["TypeScript", "Sanity"],
        githubData: { language: "TypeScript" } as Project["githubData"],
      }),
    )
    expect(tags).toEqual(["TypeScript", "Sanity"])
  })
})

describe("shortLicense", () => {
  it("shortens GitHub's license names and hides missing ones", () => {
    expect(shortLicense("GNU General Public License v3.0")).toBe("GPL-3.0")
    expect(shortLicense("MIT License")).toBe("MIT")
    expect(shortLicense("Some Custom License")).toBe("Some Custom License")
    expect(shortLicense("Not specified")).toBeNull()
    expect(shortLicense(null)).toBeNull()
  })
})
