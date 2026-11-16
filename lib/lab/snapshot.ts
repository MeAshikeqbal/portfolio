import { formatBytes, formatDate, formatPercent, formatRelative } from "@/lib/format"
import type { HomecaveT } from "@/i18n/translator"
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
 * (`/homecave/snapshot`), so the picture says exactly what the page says. Text comes from the
 * `homecave` messages through `t`, in the caller's locale.
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
export function labVerdict(status: LabStatus, now: Date, t: HomecaveT) {
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
        summary.up === null ? t("noData") : t("nodesUp", { up: summary.up, total: summary.total }),
      status: summary.status,
    })
  }
  if (pools.length > 0) {
    items.push({
      key: "pools",
      text: t("poolsHealthy", { healthy, total: pools.length }),
      status: poolStatus,
    })
  }
  if (guests[1] > 0) {
    items.push({
      key: "guests",
      text: t("guestsRunning", { running: guests[0], total: guests[1] }),
    })
  }

  return {
    summary,
    items,
    updated: lastReceived(status),
    reporting: fresh.length,
    total: status.nodes.length,
  }
}

const HEALTH: Record<string, { status: Status; label: "healthy" | "degraded" }> = {
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
export function storageRows(status: LabStatus, now: Date, t: HomecaveT): StorageRow[] {
  const rows = status.nodes.flatMap((node) => (node.storage ?? []).map((pool) => ({ node, pool })))
  const ordered = [
    ...rows.filter((r) => r.pool.kind === "pool").sort((a, b) => b.pool.totalGiB - a.pool.totalGiB),
    ...rows.filter((r) => r.pool.kind === "backup"),
  ]
  return ordered.map(({ node, pool }) => {
    if (!isNodeFresh(node, now))
      return { node, pool, health: { status: "idle", label: t("noData") } }
    if (!pool.health) return { node, pool }
    const known = HEALTH[pool.health]
    return {
      node,
      pool,
      // Unknown ZFS states (FAULTED, OFFLINE…) are shown as ZFS names them.
      health: known
        ? { status: known.status, label: t(known.label) }
        : { status: "down", label: pool.health.toLowerCase() },
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
  /** The state in words: "up · 12d", "down", "no data". */
  stateLabel: string | null
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

/** The images' fixed words, in the snapshot's language. */
export interface SnapshotLabels {
  noData: string
  notReported: string
  title: string
  storage: string
  storageMeta: string
  /** "snapshot · Nov 13, 2026 · 14:32 UTC" */
  taken: string
}

/** SnapshotCard's fixed words, from the `homecave` messages. */
export function snapshotLabels(t: HomecaveT, takenAt: string): SnapshotLabels {
  return {
    noData: t("noData"),
    notReported: t("notReported"),
    title: t("snapshotTitle"),
    storage: t("storage"),
    storageMeta: t("storageMeta"),
    taken: t("snapshotTaken", { time: takenAt }),
  }
}

/** A machine's state in words: "up · 12d", "down", "no data". */
export function nodeStateLabel(state: NodeState, t: HomecaveT): string {
  if (state.state === "up") {
    return state.uptime ? t("nodeUpFor", { uptime: state.uptime }) : t("nodeUp")
  }
  return state.state === "down" ? t("nodeDown") : t("noData")
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
  t: HomecaveT,
  locale: string,
): SnapshotNode {
  const state = nodeState(node.name, status, now)
  const live = state?.state === "up"
  const metrics: SnapshotMetric[] = []
  if (node.cpu) {
    metrics.push({
      label: t("cpu"),
      value: formatPercent(node.cpu.pct, 0),
      hint: node.load ? t("load", { values: node.load[0].toFixed(2) }) : undefined,
    })
  }
  if (node.mem) {
    metrics.push({
      label: t("memory"),
      value: formatPercent(node.mem.pct, 0),
      hint: t("ofGiB", { total: node.mem.totalGiB }),
    })
  }
  if (node.temps?.cpuC != null) {
    metrics.push({ label: t("temperature"), value: `${node.temps.cpuC}°C`, hint: t("cpuHint") })
  }
  if (node.gpu) {
    metrics.push({
      label: t("gpu"),
      value: formatPercent(node.gpu.utilPct, 0),
      hint:
        node.gpu.encoders > 0 ? t("encoding", { count: node.gpu.encoders }) : `${node.gpu.tempC}°C`,
    })
  }
  if (metrics.length < 4) {
    metrics.push({
      label: t("uptime"),
      value: live ? formatUptime(node.uptime) : "—",
      hint:
        node.availability24h !== null
          ? t("availabilityDay", { pct: formatPercent(node.availability24h) })
          : undefined,
    })
  }

  return {
    name: node.name,
    state,
    stateLabel: state && nodeStateLabel(state, t),
    live,
    lastSeen: live
      ? null
      : t("lastSeen", { ago: formatRelative(node.receivedAt, now, locale) ?? "—" }),
    hardware: node.cpu?.model ?? null,
    role,
    metrics: metrics.slice(0, 4),
    cpuTrend: (node.history.cpu ?? []).filter((v): v is number => typeof v === "number"),
    guests: node.guests
      ? t("guestsRunning", { running: node.guests.running, total: node.guests.total })
      : null,
  }
}

/**
 * Everything the snapshot image shows, from the public status only. Null before the lab has
 * reported. `specs` are the Studio's Homelab rows (order and role lines).
 */
export function labSnapshot(
  status: LabStatus | null | undefined,
  now: Date,
  specs: readonly { name: string; description: string | null }[],
  t: HomecaveT,
  locale: string,
): LabSnapshot | null {
  if (!status || status.nodes.length === 0) return null
  const verdict = labVerdict(status, now, t)
  const nodes = orderNodes(
    status.nodes,
    specs.map((s) => s.name),
  ).map((node) =>
    snapshotNode(
      node,
      status,
      now,
      specs.find((s) => s.name === node.name)?.description ?? null,
      t,
      locale,
    ),
  )
  const pools = storageRows(status, now, t).map(({ node, pool, health }) => ({
    label: pool.label,
    where: pool.kind === "backup" ? t("offSite") : node.name,
    size: `${formatBytes(pool.usedGiB)} / ${formatBytes(pool.totalGiB)}`,
    usedPct: pool.totalGiB > 0 ? Math.min(100, (pool.usedGiB / pool.totalGiB) * 100) : 0,
    health,
  }))
  const freshness = [
    verdict.reporting < verdict.total &&
      t("reporting", { reporting: verdict.reporting, total: verdict.total }),
    verdict.updated && t("updated", { ago: formatRelative(verdict.updated, now, locale) ?? "—" }),
    t("reportsEvery"),
  ]
    .filter(Boolean)
    .join(" · ")

  const { summary } = verdict
  return {
    summary: summary && {
      status: summary.status,
      label:
        summary.up === null
          ? t("noData")
          : t("labSummary", { up: summary.up, total: summary.total }),
    },
    verdict: verdict.items,
    freshness,
    nodes,
    pools,
  }
}

const pad = (n: number) => String(n).padStart(2, "0")

/** "homecave-2026-11-13-1432Z.png": sortable, and says the time is UTC. */
export function snapshotFilename(at: Date): string {
  return `homecave-${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}-${pad(at.getUTCHours())}${pad(at.getUTCMinutes())}Z.png`
}

/** "Nov 13, 2026 · 14:32 UTC" (the server can't know the viewer's time zone, so it says UTC). */
export function snapshotTime(at: Date, locale = "en"): string {
  const date = formatDate(at.toISOString(), locale)
  return `${date} · ${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())} UTC`
}
