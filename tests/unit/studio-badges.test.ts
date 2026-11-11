// @vitest-environment node
import { describe, expect, it } from "vitest"

import { messageBadge, nowBadge, postBadge, projectBadge } from "@/sanity/badges/logic"

const now = new Date("2026-11-11T12:00:00Z")
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString()

describe("project badge", () => {
  it("shows the site's status, with green only for active", () => {
    expect(
      projectBadge({ status: "active", githubData: { pushedAt: daysAgo(3) } }, now),
    ).toMatchObject({ label: "active", color: "success" })
    expect(projectBadge({ status: "maintained" }, now)).toMatchObject({
      label: "maintained",
      color: undefined,
    })
    expect(projectBadge({ status: "archived" }, now)?.label).toBe("archived")
  })

  it("says dormant when GitHub has seen no push for 180 days, whatever the CMS says", () => {
    const badge = projectBadge({ status: "active", githubData: { pushedAt: daysAgo(200) } }, now)
    expect(badge).toMatchObject({ label: "dormant", color: undefined })
    expect(badge?.title).toContain("180 days")
  })

  it("claims nothing without a status", () => {
    expect(projectBadge({}, now)).toBeNull()
    expect(projectBadge(null, now)).toBeNull()
  })
})

describe("post badge", () => {
  it("marks pinned posts, and archived wins over pinned", () => {
    expect(postBadge({ featured: true })?.label).toBe("pinned")
    expect(postBadge({ featured: true, archived: true })?.label).toBe("archived")
    expect(postBadge({})).toBeNull()
  })
})

describe("/now badge", () => {
  it("turns stale after 90 days, by the date the update was written", () => {
    expect(nowBadge({ updatedOn: daysAgo(91).slice(0, 10) }, now)).toMatchObject({
      label: "stale",
      color: "warning",
    })
    // A recent edit doesn't make an old update fresh.
    expect(
      nowBadge({ updatedOn: daysAgo(120).slice(0, 10), _updatedAt: daysAgo(1) }, now)?.label,
    ).toBe("stale")
    expect(nowBadge({ updatedOn: daysAgo(10).slice(0, 10) }, now)).toBeNull()
    expect(nowBadge({ _updatedAt: daysAgo(100) }, now)?.label).toBe("stale")
    expect(nowBadge(null, now)).toBeNull()
  })
})

describe("message badge", () => {
  it("flags unread in info blue and leaves read messages unmarked", () => {
    expect(messageBadge({ status: "unread" })).toMatchObject({ label: "unread", color: "primary" })
    expect(messageBadge({ status: "archived" })).toMatchObject({ label: "archived" })
    expect(messageBadge({ status: "read" })).toBeNull()
  })
})
