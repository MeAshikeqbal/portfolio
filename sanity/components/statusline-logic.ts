import { labSummary, nodeState } from "../../lib/lab/freshness"
import type { LabStatus } from "../../lib/lab/types"
import { syncStatus, type Status } from "../../lib/status"
import { timeAgo } from "../dashboard/logic"

/**
 * Pure cell builder for the Studio statusline (kept free of React so it can be unit-tested).
 * Like the site's system bar, it reports only measured facts: a cell whose data hasn't arrived
 * (or failed to load) is left out rather than shown with a placeholder.
 */

export interface StatuslineData {
  /** Newest GitHub sync write to a published project; null when the sync has never run. */
  syncedAt?: string | null
  /** Pending drafts in the content dataset. */
  drafts?: number
  /** Unread contact messages in the private inbox dataset. */
  unread?: number
  /** /api/lab-status; null until the lab has reported. */
  lab?: LabStatus | null
}

export interface StatuslineCell {
  key: "github" | "lab" | "inbox" | "drafts"
  label: string
  /** Colours the label and adds a dot; absent for plain counts. */
  status?: Status
  /** One dot per lab machine, each with a screen-reader label. */
  dots?: { status: Status; label: string }[]
  href?: string
  /** Opens outside the Studio (the public site), in a new tab. */
  external?: boolean
}

export function statuslineCells(data: StatuslineData, now: Date): StatuslineCell[] {
  const cells: StatuslineCell[] = []

  if (data.syncedAt) {
    const sync = syncStatus(data.syncedAt, now)
    if (sync) {
      const fresh = sync.status === "up"
      cells.push({
        key: "github",
        status: sync.status,
        label: `github · ${fresh ? "synced" : "stale"} ${timeAgo(data.syncedAt, now.getTime())}`,
      })
    }
  }

  const summary = labSummary(data.lab, now)
  if (data.lab && summary) {
    cells.push({
      key: "lab",
      // Coloured only when something isn't up, like the site's bar.
      status: summary.status === "up" ? undefined : summary.status,
      label: `lab · ${summary.label}`,
      dots: data.lab.nodes.map((node) => {
        const state = nodeState(node.name, data.lab, now)
        return {
          status: state?.status ?? "idle",
          label: `${node.name}: ${state?.label ?? "no data"}`,
        }
      }),
      href: "/homecave",
      external: true,
    })
  }

  if (typeof data.unread === "number") {
    cells.push({
      key: "inbox",
      status: data.unread > 0 ? "info" : undefined,
      label: `inbox · ${data.unread} unread`,
      href: "/studio/inbox",
    })
  }

  // A count, not a state: no colour (the site's rule for guest counts).
  if (typeof data.drafts === "number") {
    cells.push({
      key: "drafts",
      label: `${data.drafts} ${data.drafts === 1 ? "draft" : "drafts"}`,
    })
  }

  return cells
}
