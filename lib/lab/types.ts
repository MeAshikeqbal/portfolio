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

/** Broad kinds of attack the edge security sees (never the scenario names). */
export const ATTACK_KINDS = ["probing", "exploit", "bruteforce", "crawler", "other"] as const
export type AttackKind = (typeof ATTACK_KINDS)[number]

/** How a nightly backup round ended (worst across the cluster's nodes). */
export const BACKUP_STATUS = ["ok", "warnings", "failed"] as const
export type BackupStatus = (typeof BACKUP_STATUS)[number]

/**
 * Readings from the lab's root collector, carried in a node's report when they're fresh.
 * Services use the public names already on Homecave; everything else is a count or a number.
 */
export interface LabCollected {
  /** Named public services on this node: up means running (and healthy, where checked). */
  services?: { name: string; up: boolean }[]
  /** Docker containers on this node's guests that are running and not unhealthy. */
  containers?: { ok: number; total: number }
  temps?: { cpuC: number | null; diskC: number | null }
  gpu?: {
    utilPct: number
    memUsedMiB: number
    memTotalMiB: number
    tempC: number
    encoders: number
  }
  /** Last ZFS scrub per public pool label (epoch seconds) and the errors it found. */
  scrubs?: { label: string; at: number; errors: number }[]
  /** The latest nightly backup round and how many guests the jobs cover. */
  backup?: { at: number; status: BackupStatus; covered: number; total: number }
  /** Internet latency to the nearest public resolver, and packet loss. */
  wan?: { rttMs: number | null; lossPct: number }
  /** Requests through the public reverse proxy, and the share that were server errors. */
  edge?: { rpm: number; errPct: number }
  /** DNS queries over the last `hours` (up to 24) and the share blocked. */
  dns?: { queries: number; blockedPct: number; hours: number }
  /** Disk space the media re-encoder has saved. */
  media?: { savedGB: number }
  /**
   * Edge security (the reverse proxy's intrusion detection): IPs banned right now, attacks
   * detected over 24h with an hourly breakdown (oldest first), and their broad kinds; plus
   * the shared blocklist's size and the requests checked against it.
   */
  security?: {
    bans: number
    attacks24h: number
    hourly: number[]
    byKind: Partial<Record<AttackKind, number>>
    /** Known-bad IPs blocked from shared blocklists, by kind. */
    blocklist?: { total: number; byKind: Partial<Record<AttackKind, number>> }
    /** Requests the bouncer checked over 24h, and per hour (oldest first). */
    checked24h?: number
    checkedHourly?: number[]
  }
}

/** One node's latest report. Everything beyond name/online/uptime is optional (v1 lab). */
export interface LabNode extends LabCollected {
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
  /** CPU (% of this node) and memory used by running guests, per category. */
  resources?: Partial<Record<Category, { cpuPct: number; memGiB: number }>>
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
  /** CPU package °C, GPU utilisation % and edge requests/min, where the node reports them. */
  temp: (number | null)[]
  gpu: (number | null)[]
  edge: (number | null)[]
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
