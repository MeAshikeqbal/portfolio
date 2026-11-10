import type { Status } from "@/lib/status"
import type { LabNodeStatus, LabStatus } from "./types"

/**
 * A node is fresh while its latest heartbeat is younger than two intervals plus slack: 90s for
 * the 30s agents, about 10 minutes for the original 5-minute lab script.
 */
export function freshWindowMs(node: Pick<LabNodeStatus, "interval">): number {
  return ((node.interval ?? 300) * 2 + 30) * 1000
}

export function isNodeFresh(node: LabNodeStatus | undefined, now: Date): boolean {
  if (!node) return false
  const received = Date.parse(node.receivedAt)
  if (Number.isNaN(received)) return false
  const age = now.getTime() - received
  // A clock slightly ahead of ours still counts; one far ahead is not trusted.
  return age <= freshWindowMs(node) && age >= -5 * 60_000
}

/** "12d", "5h", "40m": uptime as a short machine-style figure. */
export function formatUptime(seconds: number): string {
  if (seconds >= 86_400) return `${Math.floor(seconds / 86_400)}d`
  if (seconds >= 3_600) return `${Math.floor(seconds / 3_600)}h`
  return `${Math.max(1, Math.floor(seconds / 60))}m`
}

export type NodeState = { status: Status; label: string; state: "up" | "down" | "stale" }

/**
 * One machine's measured state:
 * - **up** when its own fresh heartbeat says it's online (green, the only green);
 * - **down** when it's silent or reports offline and a fresh peer sees it offline (red);
 * - **no data** otherwise: we can't tell, so we don't claim anything (grey).
 * Null when the lab has never mentioned this name.
 */
export function nodeState(
  name: string,
  status: LabStatus | null | undefined,
  now: Date,
): NodeState | null {
  const node = status?.nodes.find((n) => n.name === name)
  if (!node) return null
  const fresh = isNodeFresh(node, now)
  if (fresh && node.online) {
    return { status: "up", label: `up · ${formatUptime(node.uptime)}`, state: "up" }
  }
  const peerSaysDown = (status?.nodes ?? []).some(
    (peer) =>
      peer.name !== name &&
      isNodeFresh(peer, now) &&
      peer.peers?.some((p) => p.name === name && !p.online),
  )
  if ((fresh && !node.online) || peerSaysDown)
    return { status: "down", label: "down", state: "down" }
  return { status: "idle", label: "no data", state: "stale" }
}

/** "3/3 up", "2/3 up" (amber), "0/3 up" (red) or "no data", for headers and the system bar. */
export function labSummary(
  status: LabStatus | null | undefined,
  now: Date,
): { status: Status; label: string } | null {
  if (!status || status.nodes.length === 0) return null
  const states = status.nodes.map((n) => nodeState(n.name, status, now)?.state)
  const up = states.filter((s) => s === "up").length
  const known = states.filter((s) => s === "up" || s === "down").length
  if (known === 0) return { status: "idle", label: "no data" }
  const total = status.nodes.length
  return { status: up === total ? "up" : up === 0 ? "down" : "warn", label: `${up}/${total} up` }
}

/** The newest heartbeat time across nodes (for "updated 20s ago"). */
export function lastReceived(status: LabStatus | null | undefined): string | null {
  const times = (status?.nodes ?? []).map((n) => n.receivedAt).sort()
  return times.at(-1) ?? null
}
