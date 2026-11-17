import { isNodeFresh, nodeState, type NodeState } from "./freshness"
import { orderNodes } from "./snapshot"
import type { BackupStatus, LabNodeStatus, LabStatus } from "./types"
import type { Status } from "@/lib/status"

/**
 * The lab's shape, for the Homecave topology: the internet line, what faces the internet and
 * where it runs, the machines with their services and pools, and the off-site backups.
 *
 * Built only from the public status (the same names and numbers the dashboard shows), so the
 * drawing reveals nothing the page doesn't already. Every status is measured: a reading from a
 * node that has gone quiet is "idle", never a guess.
 */

export interface TopologyItem {
  name: string
  status: Status
}

export interface TopologyPool extends TopologyItem {
  /** "ONLINE", "DEGRADED"…, or null where the pool doesn't report health. */
  health: string | null
  usedPct: number
}

export type TopologyRole = "edge" | "dns" | "gpu" | "backups"

export interface TopologyMachine {
  name: string
  state: NodeState | null
  /** The jobs this machine does for the rest of the lab, from what it reports. */
  roles: TopologyRole[]
  services: TopologyItem[]
  pools: TopologyPool[]
  guests: { running: number; total: number } | null
}

export interface LabTopology {
  internet: { node: string; status: Status; rttMs: number | null; lossPct: number } | null
  edge: { node: string; status: Status; rpm: number; errPct: number } | null
  dns: { node: string; status: Status; blockedPct: number; queries: number } | null
  machines: TopologyMachine[]
  backups: {
    node: string
    status: Status
    result: BackupStatus | null
    covered: number | null
    total: number | null
    usedPct: number | null
  } | null
}

/** Same thresholds as the "today in the lab" strip, so the two never disagree. */
const lossStatus = (pct: number): Status => (pct === 0 ? "up" : pct < 50 ? "warn" : "down")
const BACKUP: Record<BackupStatus, Status> = { ok: "up", warnings: "warn", failed: "down" }
const POOL: Record<string, Status> = { ONLINE: "up", DEGRADED: "warn" }

/** The node reporting `key`, a fresh one first. */
function reporter<K extends keyof LabNodeStatus>(
  nodes: readonly LabNodeStatus[],
  key: K,
  now: Date,
): { node: LabNodeStatus; value: NonNullable<LabNodeStatus[K]>; fresh: boolean } | null {
  const candidates = nodes.filter((n) => n[key] !== undefined && n[key] !== null)
  const node = candidates.find((n) => isNodeFresh(n, now)) ?? candidates[0]
  if (!node) return null
  return { node, value: node[key] as NonNullable<LabNodeStatus[K]>, fresh: isNodeFresh(node, now) }
}

const pct = (used: number, total: number) => (total > 0 ? (used / total) * 100 : 0)

export function labTopology(
  status: LabStatus,
  now: Date,
  order: readonly string[] = [],
): LabTopology {
  const nodes = orderNodes(status.nodes, order)
  const wan = reporter(nodes, "wan", now)
  const edge = reporter(nodes, "edge", now)
  const dns = reporter(nodes, "dns", now)
  const backup = reporter(nodes, "backup", now)
  // The backup store can be listed by a node that doesn't run the jobs (or the other way round).
  const store = nodes
    .flatMap((node) => (node.storage ?? []).map((pool) => ({ node, pool })))
    .find(({ pool }) => pool.kind === "backup")
  const backupNode = backup?.node ?? store?.node

  return {
    internet: wan && {
      node: wan.node.name,
      status: wan.fresh ? lossStatus(wan.value.lossPct) : "idle",
      rttMs: wan.value.rttMs,
      lossPct: wan.value.lossPct,
    },
    edge: edge && {
      node: edge.node.name,
      status: edge.fresh ? (edge.value.errPct >= 5 ? "warn" : "up") : "idle",
      rpm: edge.value.rpm,
      errPct: edge.value.errPct,
    },
    dns: dns && {
      node: dns.node.name,
      status: dns.fresh ? "up" : "idle",
      blockedPct: dns.value.blockedPct,
      queries: dns.value.queries,
    },
    machines: nodes.map((node) => {
      const fresh = isNodeFresh(node, now)
      const roles: TopologyRole[] = []
      if (node === edge?.node) roles.push("edge")
      if (node === dns?.node) roles.push("dns")
      if (node.gpu) roles.push("gpu")
      if (node === backupNode) roles.push("backups")
      return {
        name: node.name,
        state: nodeState(node.name, status, now),
        roles,
        services: (node.services ?? []).map((service) => ({
          name: service.name,
          status: fresh ? (service.up ? "up" : "down") : "idle",
        })),
        pools: (node.storage ?? [])
          .filter((pool) => pool.kind === "pool")
          .map((pool) => ({
            name: pool.label,
            health: pool.health,
            status: !fresh || !pool.health ? "idle" : (POOL[pool.health] ?? "down"),
            usedPct: pct(pool.usedGiB, pool.totalGiB),
          })),
        guests: node.guests ? { running: node.guests.running, total: node.guests.total } : null,
      }
    }),
    backups:
      backupNode === undefined
        ? null
        : {
            node: backupNode.name,
            status: backup && backup.fresh ? BACKUP[backup.value.status] : "idle",
            result: backup?.value.status ?? null,
            covered: backup?.value.covered ?? null,
            total: backup?.value.total ?? null,
            usedPct: store ? pct(store.pool.usedGiB, store.pool.totalGiB) : null,
          },
  }
}
