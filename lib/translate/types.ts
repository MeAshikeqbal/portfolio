/** Document types the site machine-translates (lib/translate/content.ts lists their fields). */
export const TRANSLATABLE_TYPES = [
  "post",
  "project",
  "now",
  "uses",
  "labChange",
  "experiences",
  "education",
  "category",
] as const

export type TranslatableType = (typeof TRANSLATABLE_TYPES)[number]
