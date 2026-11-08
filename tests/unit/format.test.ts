import { describe, expect, it } from "vitest"
import { formatCompact, formatDate, formatMonth, isCurrentPeriod } from "@/lib/format"

describe("formatting", () => {
  it("formats dates in UTC regardless of the local time zone", () => {
    expect(formatDate("2026-03-10T23:30:00Z")).toBe("Mar 10, 2026")
    expect(formatMonth("2026-03-31T23:59:00Z")).toBe("Mar 2026")
    expect(formatDate(null)).toBeNull()
  })

  it("compacts large numbers", () => {
    expect(formatCompact(619)).toBe("619")
    expect(formatCompact(1284)).toBe("1.3K")
  })
})

describe("isCurrentPeriod", () => {
  const now = new Date("2026-11-09T00:00:00Z")
  it.each([
    ["2022 - 2026", true],
    ["2026", true],
    ["2024 – present", true],
    ["2018 - 2022", false],
    ["", false],
    [null, false],
  ])("%j → %s", (period, expected) => {
    expect(isCurrentPeriod(period, now)).toBe(expected)
  })
})

describe("isCurrentPeriod word matching", () => {
  it("doesn't treat words that merely contain 'now' as current", () => {
    expect(isCurrentPeriod("unknown", new Date("2026-11-09T00:00:00Z"))).toBe(false)
  })
})
