import { formatBytes, formatPercent, formatRelative } from "@/lib/format"
import type { Status } from "@/lib/status"
import {
  formatUptime,
  isNodeFresh,
  labSummary,
  lastReceived,
  nodeState,
  type NodeState,
} from "./freshness"
import type { LabNodeStatus, LabStatus, LabStorage } from "./types"

/**
 * Pure views of a lab status shared by the live dashboard and the downloadable snapshot
 * (`/homecave/snapshot`), so the picture says exactly what the page says.
 */

/** Nodes in the Studio's Homelab order (Tower, Mini PC #1, …), then the rest by name. */
export function orderNodes(nodes: readonly LabNodeStatus[], order: readonly string[]) {
  return [...nodes].sort((a, b) => {
    const ia = order.indexOf(a.name)
    const ib = order.indexOf(b.name)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.name.localeCompare(b.name)
  })
}

export interface VerdictItem {
  key: string
  text: string
  status?: Status
}

/** The whole cluster in one line ("3/3 nodes up · 2/2 pools healthy · 31/34 guests running"). */
export function labVerdict(status: LabStatus, now: Date) {
  const summary = labSummary(status, now)
  const fresh = status.nodes.filter((n) => isNodeFresh(n, now))
  const pools = fresh.flatMap((n) => (n.storage ?? []).filter((s) => s.kind === "pool" && s.health))
  const healthy = pools.filter((p) => p.health === "ONLINE").length
  const poolStatus: Status =
    healthy === pools.length ? "up" : pools.some((p) => p.health === "DEGRADED") ? "warn" : "down"
  const guests = fresh.reduce(
    (acc, n) => [acc[0] + (n.guests?.running ?? 0), acc[1] + (n.guests?.total ?? 0)],
    [0, 0],
  )

  const items: VerdictItem[] = []
  if (summary) {
    items.push({
      key: "nodes",
      text:
        summary.label === "no data" ? "no data" : `${summary.label.replace(" up", "")} nodes up`,
      status: summary.status,
    })
  }
  if (pools.length > 0) {
    items.push({
      key: "pools",
      text: `${healthy}/${pools.length} pools healthy`,
      status: poolStatus,
    })
  }
  if (guests[1] > 0) items.push({ key: "guests", text: `${guests[0]}/${guests[1]} guests running` })

  return {
    summary,
    items,
    updated: lastReceived(status),
    reporting: fresh.length,
    total: status.nodes.length,
  }
}

const HEALTH: Record<string, { status: Status; label: string }> = {
  ONLINE: { status: "up", label: "healthy" },
  DEGRADED: { status: "warn", label: "degraded" },
}

export interface StorageRow {
  node: LabNodeStatus
  pool: LabStorage
  /** Measured health while the report is fresh; "no data" when it isn't; none for backups. */
  health?: { status: Status; label: string }
}

/** Pools first (largest first), then the off-site backup store, in one list. */
export function storageRows(status: LabStatus, now: Date): StorageRow[] {
  const rows = status.nodes.flatMap((node) => (node.storage ?? []).map((pool) => ({ node, pool })))
  const ordered = [
    ...rows.filter((r) => r.pool.kind === "pool").sort((a, b) => b.pool.totalGiB - a.pool.totalGiB),
    ...rows.filter((r) => r.pool.kind === "backup"),
  ]
  return ordered.map(({ node, pool }) => {
    if (!isNodeFresh(node, now)) return { node, pool, health: { status: "idle", label: "no data" } }
    if (!pool.health) return { node, pool }
    return {
      node,
      pool,
      health: HEALTH[pool.health] ?? { status: "down", label: pool.health.toLowerCase() },
    }
  })
}

export interface SnapshotMetric {
  label: string
  value: string
  hint?: string
}

export interface SnapshotNode {
  name: string
  state: NodeState | null
  /** Live readings are shown at full strength; a silent node's last readings are muted. */
  live: boolean
  /** "last seen 12m ago" for a node that isn't up. */
  lastSeen: string | null
  hardware: string | null
  role: string | null
  metrics: SnapshotMetric[]
  /** 24h CPU %, oldest first, gaps dropped. */
  cpuTrend: number[]
  guests: string | null
}

export interface SnapshotPool {
  label: string
  where: string
  size: string
  /** 0-100. */
  usedPct: number
  health?: { status: Status; label: string }
}

export interface LabSnapshot {
  summary: { status: Status; label: string } | null
  verdict: VerdictItem[]
  /** "updated 20s ago · reports every 30s", with "2 of 3 reporting" first when some are silent. */
  freshness: string
  nodes: SnapshotNode[]
  pools: SnapshotPool[]
}

function snapshotNode(
  node: LabNodeStatus,
  status: LabStatus,
  now: Date,
  role: string | null,
): SnapshotNode {
  const state = nodeState(node.name, status, now)
  const live = state?.state === "up"
  const metrics: SnapshotMetric[] = []
  if (node.cpu) {
    metrics.push({
      label: "cpu",
      value: formatPercent(node.cpu.pct, 0),
      hint: node.load ? `load ${node.load[0].toFixed(2)}` : undefined,
    })
  }
  if (node.mem) {
    metrics.push({
      label: "memory",
      value: formatPercent(node.mem.pct, 0),
      hint: `of ${node.mem.totalGiB} GiB`,
    })
  }
  if (node.temps?.cpuC != null) {
    metrics.push({ label: "temperature", value: `${node.temps.cpuC}°C`, hint: "cpu" })
  }
  if (node.gpu) {
    metrics.push({
      label: "gpu",
      value: formatPercent(node.gpu.utilPct, 0),
      hint: node.gpu.encoders > 0 ? `${node.gpu.encoders} encoding` : `${node.gpu.tempC}°C`,
    })
  }
  if (metrics.length < 4) {
    metrics.push({
      label: "uptime",
      value: live ? formatUptime(node.uptime) : "—",
      hint:
        node.availability24h !== null ? `${formatPercent(node.availability24h)} · 24h` : undefined,
    })
  }

  return {
    name: node.name,
    state,
    live,
    lastSeen: live ? null : `last seen ${formatRelative(node.receivedAt, now) ?? "—"}`,
    hardware: node.cpu?.model ?? null,
    role,
    metrics: metrics.slice(0, 4),
    cpuTrend: (node.history.cpu ?? []).filter((v): v is number => typeof v === "number"),
    guests: node.guests ? `${node.guests.running}/${node.guests.total} guests running` : null,
  }
}

/**
 * Everything the snapshot image shows, from the public status only. Null before the lab has
 * reported. `specs` are the Studio's Homelab rows (order and role lines).
 */
export function labSnapshot(
  status: LabStatus | null | undefined,
  now: Date,
  specs: readonly { name: string; description: string | null }[] = [],
): LabSnapshot | null {
  if (!status || status.nodes.length === 0) return null
  const verdict = labVerdict(status, now)
  const nodes = orderNodes(
    status.nodes,
    specs.map((s) => s.name),
  ).map((node) =>
    snapshotNode(node, status, now, specs.find((s) => s.name === node.name)?.description ?? null),
  )
  const pools = storageRows(status, now).map(({ node, pool, health }) => ({
    label: pool.label,
    where: pool.kind === "backup" ? "off-site" : node.name,
    size: `${formatBytes(pool.usedGiB)} / ${formatBytes(pool.totalGiB)}`,
    usedPct: pool.totalGiB > 0 ? Math.min(100, (pool.usedGiB / pool.totalGiB) * 100) : 0,
    health,
  }))
  const freshness = [
    verdict.reporting < verdict.total && `${verdict.reporting} of ${verdict.total} reporting`,
    verdict.updated && `updated ${formatRelative(verdict.updated, now)}`,
    "reports every 30s",
  ]
    .filter(Boolean)
    .join(" · ")

  return { summary: verdict.summary, verdict: verdict.items, freshness, nodes, pools }
}

const pad = (n: number) => String(n).padStart(2, "0")

/** "homecave-2026-11-13-1432Z.png": sortable, and says the time is UTC. */
export function snapshotFilename(at: Date): string {
  return `homecave-${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}-${pad(at.getUTCHours())}${pad(at.getUTCMinutes())}Z.png`
}

/** "Nov 13, 2026 · 14:32 UTC" (the server can't know the viewer's time zone, so it says UTC). */
export function snapshotTime(at: Date): string {
  const date = at.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
  return `${date} · ${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())} UTC`
}
