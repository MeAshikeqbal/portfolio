import type { StringRule } from "sanity"

/** For an image's `alt` field: required once the image itself is set. */
export const requiredAlt = (rule: StringRule) =>
  rule.custom((alt, context) => {
    const image = context.parent as { asset?: unknown } | undefined
    return image?.asset && !alt ? "Alt text is required when an image is set" : true
  })

/** "2022", "2018 - 2022" or "2024 - Present". */
export const YEAR_RANGE = /^\d{4}(\s*[-–]\s*(\d{4}|[Pp]resent))?$/

/** Why a year or range is invalid, or null when it's fine. */
export function yearRangeError(value: string): string | null {
  const match = YEAR_RANGE.exec(value.trim())
  if (!match) return "Use a year or a range, e.g. 2022 or 2018 - 2022 or 2024 - Present"
  const [start, end] = [Number(value.trim().slice(0, 4)), Number(match[2])]
  return end && end < start ? "The range ends before it starts" : null
}

export const yearRange = (rule: StringRule) =>
  rule.required().custom((value) => (value ? (yearRangeError(value) ?? true) : true))

/**
 * Where the site trims or clamps copy (DESIGN.md), so the Studio can warn before it happens:
 * a live counter (sanity/components/char-count-input.tsx) plus a `.warning()` rule, never an
 * error, so long copy can still be published.
 */
export const COPY_LIMITS = {
  /** Home page service rows clamp the description to one line, about 80 characters. */
  projectDescription: 80,
  /** The writing log trims excerpts to about 160 characters on a word boundary. */
  postExcerpt: 160,
  /** Search results cut titles at about 70 and descriptions at about 160 characters. */
  seoTitle: 70,
  seoDescription: 160,
} as const
