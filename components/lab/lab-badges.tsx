"use client"

import { StatusDot } from "@/components/dashboard/status-dot"
import { isFresh, labSummary, nodeStatus } from "@/lib/lab/freshness"
import type { LabStatus } from "@/lib/lab/types"
import { STATUS_TEXT_CLASS } from "@/lib/status"
import { cn } from "@/lib/utils"
import { useLabStatus } from "./use-lab-status"

/** A machine's measured state as dot + word ("up · 12d", "down", "no data"). */
export function LabNodeBadgeView({
  name,
  status,
  now,
  className,
}: {
  name: string
  status: LabStatus | null | undefined
  now: Date
  className?: string
}) {
  const node = status?.nodes.find((n) => n.name === name)
  const state = nodeStatus(node, isFresh(status, now))
  if (!state) return null
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 label-caps",
        STATUS_TEXT_CLASS[state.status],
        className,
      )}
    >
      <StatusDot status={state.status} className="size-1.5" />
      {state.label}
    </span>
  )
}

/** "3/3 up" for a panel header; nothing until the lab has reported. */
export function LabSummaryView({
  status,
  now,
  className,
}: {
  status: LabStatus | null | undefined
  now: Date
  className?: string
}) {
  const summary = labSummary(status, isFresh(status, now))
  if (!summary) return null
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        STATUS_TEXT_CLASS[summary.status],
        className,
      )}
    >
      <StatusDot status={summary.status} pulse={summary.status === "up"} className="size-1.5" />
      {summary.label}
    </span>
  )
}

export function LabNodeBadge(props: { name: string; className?: string }) {
  const { status, now } = useLabStatus()
  return <LabNodeBadgeView {...props} status={status} now={now} />
}

export function LabSummary(props: { className?: string }) {
  const { status, now } = useLabStatus()
  return <LabSummaryView {...props} status={status} now={now} />
}
