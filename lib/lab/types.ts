/**
 * The homelab heartbeat as the site stores and serves it. Shared by server and client, so
 * types and constants only. Every field is public: the lab sends public names (the Homecave
 * node/pool labels) and rounded numbers, never hostnames, addresses, guest names or versions.
 */

/** Public guest categories. Guests are only ever counted, by category. */
export const CATEGORIES = [
  "media",
  "network",
  "storage",
  "security",
  "home",
  "apps",
  "other",
] as const
export type Category = (typeof CATEGORIES)[number]

/** ZFS pool health as Proxmox reports it. */
export const POOL_HEALTH = [
  "ONLINE",
  "DEGRADED",
  "FAULTED",
  "OFFLINE",
  "UNAVAIL",
  "REMOVED",
] as const
export type PoolHealth = (typeof POOL_HEALTH)[number]

export interface LabStorage {
  /** Public label ("Bulk storage", "VM disks", "Off-site backups"), never the pool name. */
  label: string
  usedGiB: number
  totalGiB: number
  health: PoolHealth | null
  kind: "pool" | "backup"
}

/** One node's latest report. Everything beyond name/online/uptime is optional (v1 lab). */
export interface LabNode {
  /** Public name, matching a Homecave node ("Tower", "Mini PC #1"). */
  name: string
  online: boolean
  /** Seconds since boot, rounded to the hour by the lab; 0 when offline. */
  uptime: number
  /** Seconds between this node's heartbeats (30 for v2 agents, 300 for the v1 lab). */
  interval?: number
  cpu?: { pct: number; model: string | null; cores: number; threads: number }
  load?: [number, number, number]
  mem?: { pct: number; totalGiB: number }
  swap?: { pct: number; totalGiB: number }
  net?: { inKBps: number; outKBps: number }
  guests?: {
    running: number
    total: number
    byCategory: Partial<Record<Category, [running: number, total: number]>>
  }
  storage?: LabStorage[]
  /** How this node sees its cluster peers (lets a silent node be shown as down). */
  peers?: { name: string; online: boolean }[]
}

/** 24h of 15-minute buckets, oldest first; null where nothing was reported. */
export interface LabHistory {
  t: number[]
  cpu: (number | null)[]
  mem: (number | null)[]
  netIn: (number | null)[]
  netOut: (number | null)[]
}

export interface LabNodeStatus extends LabNode {
  /** When the site received this node's latest heartbeat (server clock, ISO). */
  receivedAt: string
  history: LabHistory
  /** Share of the last 24h's samples in which the node was up; null with too few samples. */
  availability24h: number | null
}

export interface LabStatus {
  nodes: LabNodeStatus[]
}
