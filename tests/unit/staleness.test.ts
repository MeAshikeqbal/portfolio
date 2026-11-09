import { describe, expect, it } from "vitest"
import { formatDate, formatMonth, parseDate } from "@/lib/format"
import { isStale } from "@/lib/staleness"

const today = new Date("2026-11-09T12:00:00Z")
const daysAgo = (days: number) => new Date(today.getTime() - days * 86_400_000).toISOString()

describe("isStale", () => {
  it("flips only after the threshold", () => {
    expect(isStale(daysAgo(89), today, 90)).toBe(false)
    expect(isStale(daysAgo(90), today, 90)).toBe(false)
    expect(isStale(daysAgo(91), today, 90)).toBe(true)
  })

  it("never calls future, missing or invalid dates stale", () => {
    expect(isStale(daysAgo(-5), today, 90)).toBe(false)
    expect(isStale(null, today, 90)).toBe(false)
    expect(isStale(undefined, today, 90)).toBe(false)
    expect(isStale("not a date", today, 90)).toBe(false)
  })
})

describe("date formatting with bad input", () => {
  it("returns null instead of throwing", () => {
    expect(parseDate("garbage")).toBeNull()
    expect(formatDate("garbage")).toBeNull()
    expect(formatMonth("")).toBeNull()
    expect(formatDate("2026-11-09T00:00:00Z")).toBe("Nov 9, 2026")
  })
})
