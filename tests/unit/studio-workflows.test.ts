import { describe, expect, it } from "vitest"

import { githubRows } from "@/sanity/dashboard/logic"
import { sitePath, TYPES_WITH_PAGES } from "@/sanity/presentation/paths"

describe("sitePath", () => {
  it.each([
    ["post", "hello", "/post/hello"],
    ["project", "bluebox", "/projects/bluebox"],
    ["uses", undefined, "/uses"],
    ["now", undefined, "/now"],
    ["post", undefined, null],
    ["skills", "x", null],
  ])("%s %s → %s", (type, slug, expected) => {
    expect(sitePath(type, slug)).toBe(expected)
  })

  it("agrees with TYPES_WITH_PAGES", () => {
    for (const type of TYPES_WITH_PAGES) expect(sitePath(type, "slug")).not.toBeNull()
  })
})

describe("githubRows", () => {
  it("shows one row per project (published wins) and syncs every version", () => {
    const { rows, ids } = githubRows([
      { _id: "drafts.a", title: "A (draft)" },
      { _id: "a", title: "A" },
      { _id: "drafts.b", title: "B" },
    ])
    expect(rows.map((row) => row.title)).toEqual(["A", "B"])
    expect(ids).toEqual(["drafts.a", "a", "drafts.b"])
  })
})
