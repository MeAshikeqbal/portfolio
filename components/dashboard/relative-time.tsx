"use client"

import { useHydrated } from "@/hooks/use-hydrated"
import { formatDate, formatRelative } from "@/lib/format"

/**
 * A `<time>` that reads "2h ago" in the browser. The server can't know when the page will be
 * read, so it (and the hydration render) prints the date; the age replaces it once hydrated.
 * Past a month both read as the date.
 */
export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  const hydrated = useHydrated()
  const text = hydrated ? formatRelative(iso) : formatDate(iso)
  if (!text) return null
  return (
    <time dateTime={iso} title={formatDate(iso) ?? undefined} className={className}>
      {text}
    </time>
  )
}
