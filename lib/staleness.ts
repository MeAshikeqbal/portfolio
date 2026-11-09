import { parseDate } from "@/lib/format"

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Whether `updatedAt` is more than `days` days before `now`. Missing or invalid dates are
 * never stale: we only show a status we can measure.
 */
export function isStale(updatedAt: string | null | undefined, now: Date, days: number): boolean {
  const date = parseDate(updatedAt)
  if (!date) return false
  return now.getTime() - date.getTime() > days * DAY_MS
}
