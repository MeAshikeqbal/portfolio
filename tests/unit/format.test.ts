import { describe, expect, it } from "vitest"
import { formatCompact, formatDate, formatMonth, isCurrentPeriod, trimText } from "@/lib/format"

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
    // A range that ends this year is finished (the degree's green dot was a false claim).
    ["2022 - 2026", false],
    ["2022 - 2027", true],
    // A single year is when it started: still ongoing.
    ["2026", true],
    ["2025", false],
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

describe("trimText", () => {
  it("leaves short text alone and collapses whitespace", () => {
    expect(trimText("  Short\n text. ", 50)).toBe("Short text.")
    expect(trimText(null, 50)).toBeNull()
  })

  it("cuts on a word boundary, never mid-word, and drops trailing punctuation", () => {
    const text = "Welcome to the homelab, where cables multiply and backups are a lifestyle"
    const out = trimText(text, 40)!
    expect(out.endsWith("…")).toBe(true)
    expect(out.length).toBeLessThanOrEqual(41)
    expect(text.startsWith(out.slice(0, -1))).toBe(true)
    expect(out).toBe("Welcome to the homelab, where cables…")
  })
})
