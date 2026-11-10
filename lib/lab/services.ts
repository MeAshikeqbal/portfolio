import { isNodeFresh } from "./freshness"
import type { BackupStatus, LabNodeStatus, LabStatus } from "./types"
import type { Status } from "@/lib/status"

/**
 * A named public service's measured state, from whichever node reports it:
 * - **up** / **down** while that node's report is fresh;
 * - **no data** when the node that runs it has gone quiet (we can't tell);
 * - null when no node reports it at all (so no badge is drawn).
 */
export function serviceState(
  name: string,
  status: LabStatus | null | undefined,
  now: Date,
): { status: Status; label: string } | null {
  const key = name.trim().toLowerCase()
  let seen = false
  for (const node of status?.nodes ?? []) {
    const service = node.services?.find((s) => s.name.toLowerCase() === key)
    if (!service) continue
    seen = true
    if (isNodeFresh(node, now)) {
      return service.up ? { status: "up", label: "up" } : { status: "down", label: "down" }
    }
  }
  return seen ? { status: "idle", label: "no data" } : null
}

/** The first fresh node that reports a section, with that node (for its history). */
function pick<K extends keyof LabNodeStatus>(
  nodes: LabNodeStatus[],
  key: K,
): { node: LabNodeStatus; value: NonNullable<LabNodeStatus[K]> } | null {
  for (const node of nodes) {
    const value = node[key]
    if (value !== undefined && value !== null) {
      return { node, value: value as NonNullable<LabNodeStatus[K]> }
    }
  }
  return null
}

export interface LabToday {
  edge: { rpm: number; errPct: number; trend: number[] } | null
  dns: { queries: number; blockedPct: number; hours: number } | null
  wan: { rttMs: number | null; lossPct: number } | null
  media: { savedGB: number } | null
  backup: { at: number; status: BackupStatus; covered: number; total: number } | null
  /** Across every fresh node's pools: the oldest "last scrub" and the errors found. */
  scrubs: { oldestAt: number; errors: number; pools: number } | null
  containers: { ok: number; total: number } | null
}

/** The cluster-wide numbers for the "Today in the lab" strip, from fresh reports only. */
export function labToday(status: LabStatus | null | undefined, now: Date): LabToday {
  const fresh = (status?.nodes ?? []).filter((n) => isNodeFresh(n, now))
  const edge = pick(fresh, "edge")
  const scrubs = fresh.flatMap((n) => n.scrubs ?? [])
  const withContainers = fresh.filter((n) => n.containers)
  return {
    edge: edge && {
      ...edge.value,
      trend: (edge.node.history.edge ?? []).filter((v): v is number => typeof v === "number"),
    },
    dns: pick(fresh, "dns")?.value ?? null,
    wan: pick(fresh, "wan")?.value ?? null,
    media: pick(fresh, "media")?.value ?? null,
    backup: pick(fresh, "backup")?.value ?? null,
    scrubs: scrubs.length
      ? {
          oldestAt: Math.min(...scrubs.map((s) => s.at)),
          errors: scrubs.reduce((sum, s) => sum + s.errors, 0),
          pools: scrubs.length,
        }
      : null,
    containers: withContainers.length
      ? withContainers.reduce(
          (acc, n) => ({ ok: acc.ok + n.containers!.ok, total: acc.total + n.containers!.total }),
          { ok: 0, total: 0 },
        )
      : null,
  }
}
