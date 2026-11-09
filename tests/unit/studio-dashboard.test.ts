import { describe, expect, it } from "vitest"

import { GET } from "@/app/icons/[prefix]/[icon]/route"
import {
  dedupeRecent,
  healthIssues,
  isAdmin,
  NOW_STALE_AFTER_DAYS,
  nowFreshness,
  publishedId,
  snippet,
  timeAgo,
} from "@/sanity/dashboard/logic"

describe("publishedId", () => {
  it("strips the drafts prefix", () => {
    expect(publishedId("drafts.abc")).toBe("abc")
    expect(publishedId("abc")).toBe("abc")
  })
})

describe("dedupeRecent", () => {
  const docs = [
    { _id: "drafts.p1", _type: "post", _updatedAt: "2026-11-09T10:00:00Z", title: "Hello" },
    { _id: "p1", _type: "post", _updatedAt: "2026-11-08T10:00:00Z", title: "Hello" },
    { _id: "s1", _type: "skills", _updatedAt: "2026-11-07T10:00:00Z", title: "  " },
    { _id: "x1", _type: "project", _updatedAt: "2026-11-06T10:00:00Z", title: "Proj" },
  ]

  it("keeps one row per document, newest change first", () => {
    const rows = dedupeRecent(docs)
    expect(rows.map((row) => row.id)).toEqual(["p1", "s1", "x1"])
    expect(rows[0]).toMatchObject({ draft: true, updatedAt: "2026-11-09T10:00:00Z" })
    expect(rows[1].title).toBe("Untitled")
  })

  it("respects the limit", () => {
    expect(dedupeRecent(docs, 2)).toHaveLength(2)
  })
})

describe("healthIssues", () => {
  it("lists every problem with the published id", () => {
    const issues = healthIssues(
      {
        postsNoExcerpt: [{ _id: "drafts.p1", _type: "post", title: "Post" }],
        imagesNoAlt: [{ _id: "x1", _type: "project", title: "Proj" }],
        projectsIncomplete: [{ _id: "x1", _type: "project", title: "Proj" }],
        skillsNoIcon: [{ _id: "s2", _type: "skills", title: null }],
      },
      [{ _id: "s1", _type: "skills", title: "AWS", icon: "logos:nope" }],
    )
    expect(issues).toEqual([
      { id: "s1", type: "skills", title: "AWS", problem: "Icon “logos:nope” not found" },
      { id: "s2", type: "skills", title: "Untitled", problem: "No icon" },
      { id: "x1", type: "project", title: "Proj", problem: "Cover image has no alt text" },
      { id: "p1", type: "post", title: "Post", problem: "No excerpt" },
      { id: "x1", type: "project", title: "Proj", problem: "Missing status or tech" },
    ])
  })
})

describe("timeAgo", () => {
  const now = Date.parse("2026-11-09T12:00:00Z")
  it.each([
    ["2026-11-09T11:59:30Z", "30s ago"],
    ["2026-11-09T11:15:00Z", "45m ago"],
    ["2026-11-09T09:00:00Z", "3h ago"],
    ["2026-11-02T12:00:00Z", "7d ago"],
    ["2026-05-09T12:00:00Z", "6mo ago"],
    ["2024-11-09T12:00:00Z", "2y ago"],
    ["2026-11-10T12:00:00Z", "0s ago"],
  ])("%s → %s", (iso, expected) => {
    expect(timeAgo(iso, now)).toBe(expected)
  })
})

describe("snippet", () => {
  it("flattens whitespace and truncates", () => {
    expect(snippet("hi\n\n  there")).toBe("hi there")
    expect(snippet("a".repeat(100), 10)).toBe(`${"a".repeat(9)}…`)
    expect(snippet(null)).toBe("")
  })
})

describe("isAdmin", () => {
  it("checks for the administrator role", () => {
    expect(isAdmin({ roles: [{ name: "administrator" }] })).toBe(true)
    expect(isAdmin({ roles: [{ name: "editor" }] })).toBe(false)
    expect(isAdmin(null)).toBe(false)
  })
})

describe("icon route X-Icon-Found", () => {
  const get = (prefix: string, icon: string) =>
    GET(new Request("http://localhost/icons"), { params: Promise.resolve({ prefix, icon }) })

  it("is 1 for a bundled icon and 0 for the fallback", async () => {
    expect((await get("logos", "aws.svg")).headers.get("X-Icon-Found")).toBe("1")
    expect((await get("logos", "definitely-not-an-icon.svg")).headers.get("X-Icon-Found")).toBe("0")
    expect((await get("nope", "aws.svg")).headers.get("X-Icon-Found")).toBe("0")
  })
})

describe("nowFreshness", () => {
  const now = Date.parse("2026-11-09T12:00:00Z")
  const daysAgo = (days: number) => new Date(now - days * 86_400_000).toISOString()

  it("is fresh up to the threshold and stale after it", () => {
    expect(nowFreshness(daysAgo(0), now)).toMatchObject({ state: "fresh", label: "Updated today" })
    expect(nowFreshness(daysAgo(1), now).label).toBe("Updated 1 day ago")
    expect(nowFreshness(daysAgo(90), now)).toMatchObject({ state: "fresh", days: 90 })
    expect(nowFreshness(daysAgo(91), now)).toMatchObject({
      state: "stale",
      days: 91,
      label: "Updated 91 days ago: time for a new update",
    })
  })

  it("reports a missing or invalid date as unpublished", () => {
    expect(nowFreshness(null, now).state).toBe("unpublished")
    expect(nowFreshness(undefined, now).state).toBe("unpublished")
    expect(nowFreshness("garbage", now).state).toBe("unpublished")
  })

  it("never goes negative for future timestamps", () => {
    expect(nowFreshness(daysAgo(-3), now)).toMatchObject({ state: "fresh", days: 0 })
  })

  it("matches the site's threshold", () => {
    expect(NOW_STALE_AFTER_DAYS).toBe(90)
  })
})
