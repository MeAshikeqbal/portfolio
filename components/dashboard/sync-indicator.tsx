"use client"

import { useHydrated } from "@/hooks/use-hydrated"
import { formatDate } from "@/lib/format"
import { syncStatus, type Status } from "@/lib/status"
import { StatusDot } from "./status-dot"

interface SyncIndicatorProps {
  syncedAt: string
  /** The status as judged when the page was rendered; used until the browser re-checks. */
  initial: { status: Status; label: string } | null
}

/**
 * GitHub sync health. Pages are static, so the server's verdict can be days old by the time
 * someone reads it; after hydration the age is re-judged against the visitor's clock.
 */
export function SyncIndicator({ syncedAt, initial }: SyncIndicatorProps) {
  const hydrated = useHydrated()
  const current = hydrated ? syncStatus(syncedAt) : initial
  if (!current) return null

  return (
    <span className="flex shrink-0 items-center gap-2">
      <StatusDot status={current.status} />
      {current.label} · <time dateTime={syncedAt}>{formatDate(syncedAt)}</time>
    </span>
  )
}
