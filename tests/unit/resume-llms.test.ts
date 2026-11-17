import { describe, expect, it } from "vitest"
import type { Education, Experience, PostCard, Project, Skill } from "@/lib/api"
import { llmsText } from "@/lib/llms"
import { resumeMarkdown } from "@/lib/resume"

const experiences = [
  {
    _id: "e1",
    year: " 2026",
    works: [
      {
        _key: "w",
        name: "Head of Software",
        company: "Acme",
        copmanyLogo: null,
        desc: "Runs  the\nteam.",
      },
    ],
  },
] as unknown as Experience[]
const education = [
  { _id: "d1", year: "2022 - 2026", degree: "B.Tech", school: "SKF", schoolLogo: null, desc: null },
] as unknown as Education[]
const skills = [
  { _id: "s1", name: "TypeScript", icon: null, category: "languages" },
  { _id: "s2", name: "Proxmox VE", icon: null, category: "self-hosting" },
  { _id: "s3", name: "Unsorted", icon: null, category: null },
] as unknown as Skill[]
const project = (title: string, slug: string, status: string, pushedAt: string) =>
  ({
    _id: slug,
    title,
    slug,
    description: `${title} does a thing.`,
    status,
    tech: ["Go"],
    githubData: { pushedAt },
  }) as unknown as Project
const projects = [
  project("Old", "old", "archived", "2026-01-01T00:00:00Z"),
  project("Quiet", "quiet", "maintained", "2025-01-01T00:00:00Z"),
  project("Busy", "busy", "active", "2026-11-01T00:00:00Z"),
]
const posts = [
  {
    _id: "p1",
    title: "First",
    slug: "first",
    publishedAt: "2026-03-10T00:00:00Z",
    excerpt: `${"word ".repeat(60)}`,
  },
  { _id: "p2", title: "No slug", slug: null, publishedAt: null, excerpt: null },
] as unknown as PostCard[]

describe("resumeMarkdown", () => {
  const md = resumeMarkdown(
    { experiences, education, skills, projects, posts },
    new Date("2026-11-17T08:00:00Z"),
  )

  it("leads with the name, role, links and tagline", () => {
    expect(
      md.startsWith(
        "# Ashik Eqbal\n\nSoftware engineer · itsashik.dev · github.com/MeAshikEqbal · linkedin.com/in/itsashik\n\n",
      ),
    ).toBe(true)
  })

  it("lists experience and education with tidy whitespace", () => {
    expect(md).toContain("### Head of Software, Acme (2026)\n\nRuns the team.")
    expect(md).toContain("### B.Tech, SKF (2022 - 2026)")
  })

  it("lists live projects, most recently active first, and leaves archived ones out", () => {
    expect(md.indexOf("**Busy**")).toBeLessThan(md.indexOf("**Quiet**"))
    expect(md).not.toContain("**Old**")
    expect(md).toContain(
      "- **Busy** (active): Busy does a thing. _Go._ https://www.itsashik.dev/projects/busy",
    )
  })

  it("groups skills like the home page, without uncategorized ones", () => {
    expect(md).toContain("- **Languages & frontend:** TypeScript")
    expect(md).toContain("- **Infrastructure & homelab:** Proxmox VE")
    expect(md).not.toContain("Unsorted")
  })

  it("links recent writing and says where it came from", () => {
    expect(md).toContain("- [First](https://www.itsashik.dev/post/first) (2026-03)")
    expect(
      md.endsWith(
        "Generated from itsashik.dev on 2026-11-17. PDF: https://www.itsashik.dev/resume.pdf\n",
      ),
    ).toBe(true)
  })
})

describe("llmsText", () => {
  const text = llmsText({ posts, projects, hasNow: false })

  it("follows llmstxt.org: title, summary, then link sections", () => {
    expect(text.startsWith("# Ashik Eqbal\n\n> ")).toBe(true)
    for (const heading of ["## Posts", "## Projects", "## About", "## Optional"])
      expect(text).toContain(heading)
  })

  it("points posts at their Markdown, with whole-word excerpts", () => {
    expect(text).toMatch(
      /- \[First\]\(https:\/\/www\.itsashik\.dev\/post\/first\.md\): (word )+word…\n/,
    )
    expect(text).not.toContain("No slug")
  })

  it("lists /now only when it has content", () => {
    expect(text).not.toContain("/now")
    expect(llmsText({ posts, projects, hasNow: true })).toContain("(https://www.itsashik.dev/now)")
  })
})
