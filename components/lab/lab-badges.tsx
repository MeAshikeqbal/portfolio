"use client"

import Link from "next/link"
import { StatusDot } from "@/components/dashboard/status-dot"
import { labSummary, nodeState } from "@/lib/lab/freshness"
import { serviceState } from "@/lib/lab/services"
import type { LabStatus } from "@/lib/lab/types"
import { STATUS_TEXT_CLASS, type Status } from "@/lib/status"
import { cn } from "@/lib/utils"
import { useLabStatus } from "./use-lab-status"

/** A machine's measured state as dot + word ("up · 12d", "down", "no data"). */
export function LabNodeBadgeView({
  name,
  status,
  now,
  compact = false,
  className,
}: {
  name: string
  status: LabStatus | null | undefined
  now: Date
  /** Just the state word ("up"), for places that show uptime on their own. */
  compact?: boolean
  className?: string
}) {
  const state = nodeState(name, status, now)
  if (!state) return null
  const label = compact ? state.label.split(" · ")[0] : state.label
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 label-caps",
        STATUS_TEXT_CLASS[state.status],
        className,
      )}
    >
      <StatusDot status={state.status} className="size-1.5" />
      {label}
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
  const summary = labSummary(status, now)
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

/**
 * "lab ●●● 3/3 up" in the statusline, one dot per machine, linking to Homecave; hidden until
 * the lab has reported. The count is coloured only when something isn't up.
 */
export function LabBarItem({ className }: { className?: string }) {
  const { status, now } = useLabStatus()
  const summary = labSummary(status, now)
  if (!status || !summary) return null
  return (
    <Link href="/homecave" className={cn("flex shrink-0 items-center gap-2", className)}>
      lab
      <span className="flex items-center gap-1">
        {status.nodes.map((node) => {
          const state = nodeState(node.name, status, now)
          return state ? (
            <StatusDot
              key={node.name}
              status={state.status}
              label={`${node.name} ${state.label.split(" · ")[0]},`}
              className="size-1.5"
            />
          ) : null
        })}
      </span>
      <span className={cn(summary.status !== "up" && STATUS_TEXT_CLASS[summary.status])}>
        {summary.label}
      </span>
    </Link>
  )
}

/** A named service's measured state as dot + word ("up", "down", "no data"). */
export function LabServiceBadgeView({
  state,
  className,
}: {
  state: { status: Status; label: string } | null
  className?: string
}) {
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

/**
 * A Homecave service row's live badge. `initial` is the server's answer for the same snapshot,
 * so the first paint matches; the shared 30s poll takes over from there.
 */
export function LabServiceBadge({
  name,
  initial,
  className,
}: {
  name: string
  initial: { status: Status; label: string } | null
  className?: string
}) {
  const { status, now } = useLabStatus()
  const state = status === undefined ? initial : serviceState(name, status, now)
  return <LabServiceBadgeView state={state} className={cn("mt-1", className)} />
}

/** The hero's per-machine dot, with its state for screen readers. Nothing for unknown names. */
export function LabNodeDot({ name }: { name: string }) {
  const { status, now } = useLabStatus()
  const state = nodeState(name, status, now)
  // Read before the name: "up: Tower …". Uptime stays on Homecave.
  return state ? (
    <StatusDot status={state.status} label={`${state.label.split(" · ")[0]}:`} />
  ) : null
}

/**
 * The state as a word, only when a machine isn't up, so trouble is never colour alone.
 * Healthy rows stay quiet; the "3/3 up" summary above them carries the words.
 */
export function LabNodeTrouble({ name }: { name: string }) {
  const { status, now } = useLabStatus()
  const state = nodeState(name, status, now)
  if (!state || state.state === "up") return null
  return <span className={cn("label-caps", STATUS_TEXT_CLASS[state.status])}>{state.label}</span>
}
