"use client"

import { useHydrated } from "@/hooks/use-hydrated"
import { STATUS_TEXT_CLASS, syncStatus, type Status } from "@/lib/status"
import { cn } from "@/lib/utils"
import { RelativeTime } from "./relative-time"
import { StatusDot } from "./status-dot"

interface SyncIndicatorProps {
  syncedAt: string
  /** The status as judged when the page was rendered; used until the browser re-checks. */
  initial: { status: Status; label: string } | null
  className?: string
}

/**
 * GitHub sync health as a statusline cell: "github · synced 2h ago", or "github · stale 3d ago"
 * in amber. Pages are static, so the server's verdict can be days old by the time someone reads
 * it; after hydration the age is re-judged against the visitor's clock.
 */
export function SyncIndicator({ syncedAt, initial, className }: SyncIndicatorProps) {
  const hydrated = useHydrated()
  const current = hydrated ? syncStatus(syncedAt) : initial
  if (!current) return null
  const fresh = current.status === "up"

  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-2",
        !fresh && STATUS_TEXT_CLASS[current.status],
        className,
      )}
    >
      <StatusDot status={current.status} />
      <span>
        github · {fresh ? "synced" : "stale"} <RelativeTime iso={syncedAt} />
      </span>
    </span>
  )
}
