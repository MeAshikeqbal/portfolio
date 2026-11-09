import type { StringRule } from "sanity"

/** For an image's `alt` field: required once the image itself is set. */
export const requiredAlt = (rule: StringRule) =>
  rule.custom((alt, context) => {
    const image = context.parent as { asset?: unknown } | undefined
    return image?.asset && !alt ? "Alt text is required when an image is set" : true
  })

/** "2022", "2018 - 2022" or "2024 - Present". */
export const YEAR_RANGE = /^\d{4}(\s*[-–]\s*(\d{4}|[Pp]resent))?$/

export const yearRange = (rule: StringRule) =>
  rule
    .required()
    .custom((value) =>
      !value || YEAR_RANGE.test(value.trim())
        ? true
        : "Use a year or a range, e.g. 2022 or 2018 - 2022 or 2024 - Present",
    )
