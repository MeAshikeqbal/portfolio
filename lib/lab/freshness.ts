import type { Status } from "@/lib/status"
import type { LabNode, LabStatus } from "./types"

/** The lab reports every 5 minutes; past 10 without one, nothing is claimed. */
export const LAB_FRESH_MINUTES = 10

export function isFresh(status: LabStatus | null | undefined, now: Date): boolean {
  if (!status) return false
  const received = Date.parse(status.receivedAt)
  if (Number.isNaN(received)) return false
  const age = now.getTime() - received
  // A clock slightly ahead of ours still counts; one far ahead is not trusted.
  return age <= LAB_FRESH_MINUTES * 60_000 && age >= -5 * 60_000
}

/** "12d", "5h", "40m": uptime as a short machine-style figure. */
export function formatUptime(seconds: number): string {
  if (seconds >= 86_400) return `${Math.floor(seconds / 86_400)}d`
  if (seconds >= 3_600) return `${Math.floor(seconds / 3_600)}h`
  return `${Math.max(1, Math.floor(seconds / 60))}m`
}

/** One machine's measured state. Green only for a fresh heartbeat that says it's online. */
export function nodeStatus(
  node: LabNode | undefined,
  fresh: boolean,
): { status: Status; label: string } | null {
  if (!node) return null
  if (!fresh) return { status: "idle", label: "no data" }
  return node.online
    ? { status: "up", label: `up · ${formatUptime(node.uptime)}` }
    : { status: "down", label: "down" }
}

/** "3/3 up", "2/3 up" (warn) or "no data", for the panel header. */
export function labSummary(
  status: LabStatus | null | undefined,
  fresh: boolean,
): { status: Status; label: string } | null {
  if (!status || status.nodes.length === 0) return null
  if (!fresh) return { status: "idle", label: "no data" }
  const up = status.nodes.filter((node) => node.online).length
  const total = status.nodes.length
  return { status: up === total ? "up" : up === 0 ? "down" : "warn", label: `${up}/${total} up` }
}
