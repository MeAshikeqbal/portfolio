import { describe, expect, it } from "vitest"

import { rankSequence } from "@/sanity/migrations/order-rank"
import { YEAR_RANGE, yearRangeError } from "@/sanity/schemaTypes/validation"

describe("rankSequence", () => {
  it("returns unique, strictly ascending ranks", () => {
    const ranks = rankSequence(130)
    expect(ranks).toHaveLength(130)
    expect(new Set(ranks).size).toBe(130)
    expect([...ranks].sort()).toEqual(ranks)
  })
})

describe("YEAR_RANGE", () => {
  it.each(["2026", "2018 - 2022", "2022–2026", "2024 - Present", "2024 - present"])(
    "accepts %s",
    (value) => expect(YEAR_RANGE.test(value)).toBe(true),
  )
  it.each(["26", "2018 to 2022", "Present", "2018 -"])("rejects %s", (value) =>
    expect(YEAR_RANGE.test(value)).toBe(false),
  )
})

describe("yearRangeError", () => {
  it("accepts forward ranges and single years", () => {
    expect(yearRangeError("2018 - 2022")).toBeNull()
    expect(yearRangeError("2022 - 2022")).toBeNull()
    expect(yearRangeError("2024 - Present")).toBeNull()
    expect(yearRangeError("2026")).toBeNull()
  })
  it("rejects reversed ranges and bad formats", () => {
    expect(yearRangeError("2024 - 2018")).toBe("The range ends before it starts")
    expect(yearRangeError("soon")).toMatch(/Use a year or a range/)
  })
})
