"use client"

import { useTranslations } from "next-intl"
import { StatusDot } from "@/components/dashboard/status-dot"
import { labSummary, nodeState, type LabSummary, type NodeState } from "@/lib/lab/freshness"
import { serviceState } from "@/lib/lab/services"
import type { LabStatus } from "@/lib/lab/types"
import { STATUS_TEXT_CLASS, type Status } from "@/lib/status"
import { cn } from "@/lib/utils"
import { useLabStatus } from "./use-lab-status"
import { Link } from "@/i18n/navigation"

type LabT = ReturnType<typeof useTranslations<"lab">>

/** A machine's state in words: "up · 12d" (or just "up" when `compact`), "down", "no data". */
function nodeLabel(t: LabT, state: NodeState, compact = false): string {
  if (state.state === "up")
    return compact || !state.uptime ? t("up") : t("upFor", { uptime: state.uptime })
  return state.state === "down" ? t("down") : t("noData")
}

/** "3/3 up" or "no data". */
function summaryLabel(t: LabT, summary: LabSummary): string {
  return summary.up === null ? t("noData") : t("summary", { up: summary.up, total: summary.total })
}

/** A service's state in words, from its status colour. */
function serviceLabel(t: LabT, status: Status): string {
  return status === "up" ? t("up") : status === "down" ? t("down") : t("noData")
}

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
  const t = useTranslations("lab")
  const state = nodeState(name, status, now)
  if (!state) return null
  const label = nodeLabel(t, state, compact)
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
  const t = useTranslations("lab")
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
      {summaryLabel(t, summary)}
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
  const t = useTranslations("lab")
  const { status, now } = useLabStatus()
  const summary = labSummary(status, now)
  if (!status || !summary) return null
  return (
    <Link href="/homecave" className={cn("flex shrink-0 items-center gap-2", className)}>
      {t("bar")}
      <span className="flex items-center gap-1">
        {status.nodes.map((node) => {
          const state = nodeState(node.name, status, now)
          return state ? (
            <StatusDot
              key={node.name}
              status={state.status}
              label={t("dotLabel", { name: node.name, state: nodeLabel(t, state, true) })}
              className="size-1.5"
            />
          ) : null
        })}
      </span>
      <span className={cn(summary.status !== "up" && STATUS_TEXT_CLASS[summary.status])}>
        {summaryLabel(t, summary)}
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
  const t = useTranslations("lab")
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
      {serviceLabel(t, state.status)}
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
  const t = useTranslations("lab")
  const { status, now } = useLabStatus()
  const state = nodeState(name, status, now)
  // Read before the name: "up: Tower …". Uptime stays on Homecave.
  return state ? (
    <StatusDot status={state.status} label={t("dotState", { state: nodeLabel(t, state, true) })} />
  ) : null
}

/**
 * The state as a word, only when a machine isn't up, so trouble is never colour alone.
 * Healthy rows stay quiet; the "3/3 up" summary above them carries the words.
 */
export function LabNodeTrouble({ name }: { name: string }) {
  const t = useTranslations("lab")
  const { status, now } = useLabStatus()
  const state = nodeState(name, status, now)
  if (!state || state.state === "up") return null
  return (
    <span className={cn("label-caps", STATUS_TEXT_CLASS[state.status])}>{nodeLabel(t, state)}</span>
  )
}
