import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"
import {
  ATTACK_KINDS,
  BACKUP_STATUS,
  CATEGORIES,
  POOL_HEALTH,
  type Category,
  type LabCollected,
  type LabNode,
  type LabStorage,
} from "./types"

/** Heartbeats are a couple of KB at most; anything bigger is not ours. */
export const MAX_BODY_BYTES = 8192
/** How far the lab's clock may be from ours before a signed request is refused. */
export const MAX_SKEW_SECONDS = 300
export const MAX_NODES = 8
const MAX_STORAGE = 16
const MAX_SERVICES = 24

/** Public names only: letters, digits, spaces and a little punctuation. No dots, colons or slashes. */
const NAME = /^[A-Za-z0-9][A-Za-z0-9 #_-]{0,31}$/
/** Public service names may also hold commas and plus signs ("Sonarr, Radarr, Lidarr"). */
const SERVICE_NAME = /^[A-Za-z0-9][A-Za-z0-9 #,+_-]{0,47}$/
/** A short CPU model ("Ryzen 5 3600", "Core i3-6100"): no vendors' (R)/(TM), clocks or versions. */
const CPU_MODEL = /^[A-Za-z][A-Za-z0-9 -]{1,31}$/

/** HMAC-SHA256 over `${timestamp}.${body}`, hex. The lab script computes the same. */
export function sign(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")
}

/** Constant-time check of the signature and a freshness window on the signed timestamp. */
export function verify(
  secret: string,
  timestamp: string | null,
  signature: string | null,
  body: string,
  now: Date = new Date(),
): boolean {
  if (!secret || !timestamp || !signature || !/^\d{9,11}$/.test(timestamp)) return false
  if (!/^[0-9a-f]{64}$/.test(signature)) return false
  if (Math.abs(now.getTime() / 1000 - Number(timestamp)) > MAX_SKEW_SECONDS) return false
  const expected = Buffer.from(sign(secret, timestamp, body), "hex")
  return timingSafeEqual(expected, Buffer.from(signature, "hex"))
}

class Invalid extends Error {}
const fail = (): never => {
  throw new Invalid()
}
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : fail()
const num = (v: unknown, min: number, max: number, digits = 0): number => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) fail()
  const f = 10 ** digits
  return Math.round((v as number) * f) / f
}
const int = (v: unknown, min: number, max: number) => num(v, min, max, 0)
const name = (v: unknown): string => (typeof v === "string" && NAME.test(v) ? v : fail())
const bool = (v: unknown): boolean => (typeof v === "boolean" ? v : fail())
const orNull = <T>(v: unknown, parse: (v: unknown) => T): T | null =>
  v === null || v === undefined ? null : parse(v)
const list = (v: unknown, max: number): unknown[] =>
  Array.isArray(v) && v.length <= max ? v : fail()
/** Epoch seconds between 2020 and 2100. */
const epoch = (v: unknown) => int(v, 1_577_836_800, 4_102_444_800)

/** The root collector's sections, each optional and bounded; a bad one rejects the report. */
function parseCollected(n: Record<string, unknown>): LabCollected {
  const out: LabCollected = {}
  if (n.services !== undefined) {
    out.services = list(n.services, MAX_SERVICES).map((v) => {
      const s = obj(v)
      if (typeof s.name !== "string" || !SERVICE_NAME.test(s.name)) fail()
      return { name: s.name as string, up: bool(s.up) }
    })
    if (new Set(out.services.map((s) => s.name)).size !== out.services.length) fail()
  }
  if (n.containers !== undefined) {
    const c = obj(n.containers)
    const ok = int(c.ok, 0, 10_000)
    const total = int(c.total, 0, 10_000)
    if (ok > total) fail()
    out.containers = { ok, total }
  }
  if (n.temps !== undefined) {
    const t = obj(n.temps)
    out.temps = {
      cpuC: orNull(t.cpuC, (v) => int(v, 0, 150)),
      diskC: orNull(t.diskC, (v) => int(v, 0, 100)),
    }
  }
  if (n.gpu !== undefined) {
    const g = obj(n.gpu)
    const memTotalMiB = int(g.memTotalMiB, 1, 1_000_000)
    const memUsedMiB = int(g.memUsedMiB, 0, memTotalMiB)
    out.gpu = {
      utilPct: int(g.utilPct, 0, 100),
      memUsedMiB,
      memTotalMiB,
      tempC: int(g.tempC, 0, 150),
      encoders: int(g.encoders, 0, 64),
    }
  }
  if (n.scrubs !== undefined) {
    out.scrubs = list(n.scrubs, MAX_STORAGE).map((v) => {
      const s = obj(v)
      return { label: name(s.label), at: epoch(s.at), errors: int(s.errors, 0, 1e9) }
    })
  }
  if (n.backup !== undefined) {
    const b = obj(n.backup)
    if (!(BACKUP_STATUS as readonly unknown[]).includes(b.status)) fail()
    const covered = int(b.covered, 0, 10_000)
    const total = int(b.total, 0, 10_000)
    if (covered > total) fail()
    out.backup = {
      at: epoch(b.at),
      status: b.status as (typeof BACKUP_STATUS)[number],
      covered,
      total,
    }
  }
  if (n.wan !== undefined) {
    const w = obj(n.wan)
    out.wan = {
      rttMs: orNull(w.rttMs, (v) => num(v, 0, 10_000, 1)),
      lossPct: int(w.lossPct, 0, 100),
    }
  }
  if (n.edge !== undefined) {
    const e = obj(n.edge)
    out.edge = { rpm: num(e.rpm, 0, 10_000_000, 1), errPct: num(e.errPct, 0, 100, 1) }
  }
  if (n.dns !== undefined) {
    const d = obj(n.dns)
    out.dns = {
      queries: int(d.queries, 0, 1e9),
      blockedPct: num(d.blockedPct, 0, 100, 1),
      hours: int(d.hours, 1, 24),
    }
  }
  if (n.media !== undefined) {
    out.media = { savedGB: int(obj(n.media).savedGB, 0, 10_000_000) }
  }
  if (n.security !== undefined) {
    const sec = obj(n.security)
    const attacks24h = int(sec.attacks24h, 0, 10_000_000)
    const hourly = list(sec.hourly, 24).map((v) => int(v, 0, 10_000_000))
    if (hourly.length !== 24) fail()
    const byKind: Partial<Record<(typeof ATTACK_KINDS)[number], number>> = {}
    for (const [key, value] of Object.entries(obj(sec.byKind))) {
      if (!(ATTACK_KINDS as readonly string[]).includes(key)) fail()
      byKind[key as (typeof ATTACK_KINDS)[number]] = int(value, 0, 10_000_000)
    }
    // The three views of the same 24h must agree.
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
    if (sum(hourly) !== attacks24h || sum(Object.values(byKind)) !== attacks24h) fail()
    out.security = { bans: int(sec.bans, 0, 10_000_000), attacks24h, hourly, byKind }
  }
  return out
}

function parseStorage(v: unknown): LabStorage {
  const s = obj(v)
  const health = s.health ?? null
  if (health !== null && !(POOL_HEALTH as readonly unknown[]).includes(health)) fail()
  if (s.kind !== "pool" && s.kind !== "backup") fail()
  const usedGiB = int(s.usedGiB, 0, 1_000_000)
  const totalGiB = int(s.totalGiB, 1, 1_000_000)
  if (usedGiB > totalGiB) fail()
  return {
    label: name(s.label),
    usedGiB,
    totalGiB,
    health: health as LabStorage["health"],
    kind: s.kind as LabStorage["kind"],
  }
}

/** One node, allowlisted field by field. Unknown keys are dropped; a bad known field throws. */
function parseNode(v: unknown): LabNode {
  const n = obj(v)
  const online = bool(n.online)
  const node: LabNode = { name: name(n.name), online, uptime: online ? int(n.uptime, 0, 1e9) : 0 }
  if (n.interval !== undefined) node.interval = int(n.interval, 10, 600)
  if (n.cpu !== undefined) {
    const c = obj(n.cpu)
    const model = c.model ?? null
    if (model !== null && (typeof model !== "string" || !CPU_MODEL.test(model))) fail()
    node.cpu = {
      pct: int(c.pct, 0, 100),
      model: model as string | null,
      cores: int(c.cores, 1, 256),
      threads: int(c.threads, 1, 512),
    }
  }
  if (n.load !== undefined) {
    if (!Array.isArray(n.load) || n.load.length !== 3) fail()
    const [a, b, c] = n.load as unknown[]
    node.load = [num(a, 0, 1000, 2), num(b, 0, 1000, 2), num(c, 0, 1000, 2)]
  }
  for (const key of ["mem", "swap"] as const) {
    if (n[key] === undefined) continue
    const m = obj(n[key])
    node[key] = { pct: int(m.pct, 0, 100), totalGiB: num(m.totalGiB, 0, 100_000, 1) }
  }
  if (n.net !== undefined) {
    const t = obj(n.net)
    node.net = { inKBps: int(t.inKBps, 0, 10_000_000), outKBps: int(t.outKBps, 0, 10_000_000) }
  }
  if (n.guests !== undefined) {
    const g = obj(n.guests)
    const byCategory: Partial<Record<Category, [number, number]>> = {}
    for (const [key, value] of Object.entries(obj(g.byCategory ?? {}))) {
      if (!(CATEGORIES as readonly string[]).includes(key)) fail()
      if (!Array.isArray(value) || value.length !== 2) fail()
      const [running, total] = value as unknown[]
      const pair: [number, number] = [int(running, 0, 1000), int(total, 0, 1000)]
      if (pair[0] > pair[1]) fail()
      byCategory[key as Category] = pair
    }
    const running = int(g.running, 0, 1000)
    const total = int(g.total, 0, 1000)
    if (running > total) fail()
    node.guests = { running, total, byCategory }
  }
  if (n.resources !== undefined) {
    const resources: NonNullable<LabNode["resources"]> = {}
    for (const [key, value] of Object.entries(obj(n.resources))) {
      if (!(CATEGORIES as readonly string[]).includes(key)) fail()
      const r = obj(value)
      resources[key as Category] = {
        cpuPct: num(r.cpuPct, 0, 100, 1),
        memGiB: num(r.memGiB, 0, 100_000, 1),
      }
    }
    node.resources = resources
  }
  return { ...node, ...parseCollected(n) }
}

/**
 * The allowlisted nodes from a heartbeat body, or null if it's malformed in any way.
 * - v1 (the original lab script): `{ nodes: [{ name, online, uptime }, …] }`, all nodes at once.
 * - v2 (one agent per node): `{ v: 2, node: {…}, storage: […], peers: […] }`.
 */
export function parseHeartbeat(json: unknown): LabNode[] | null {
  try {
    const body = obj(json)
    let nodes: LabNode[]
    if (body.v === 2) {
      const node = parseNode(body.node)
      if (node.interval === undefined) fail()
      if (body.storage !== undefined) {
        if (!Array.isArray(body.storage) || body.storage.length > MAX_STORAGE) fail()
        node.storage = (body.storage as unknown[]).map(parseStorage)
      }
      if (body.peers !== undefined) {
        if (!Array.isArray(body.peers) || body.peers.length > MAX_NODES) fail()
        node.peers = (body.peers as unknown[]).map((p) => {
          const peer = obj(p)
          return { name: name(peer.name), online: bool(peer.online) }
        })
      }
      nodes = [node]
    } else {
      if (!Array.isArray(body.nodes) || body.nodes.length === 0 || body.nodes.length > MAX_NODES)
        fail()
      nodes = (body.nodes as unknown[]).map((n) => {
        const { name: nodeName, online, uptime } = obj(n)
        return { ...parseNode({ name: nodeName, online, uptime }), interval: 300 }
      })
    }
    if (new Set(nodes.map((n) => n.name)).size !== nodes.length) return null
    return nodes
  } catch (error) {
    if (error instanceof Invalid) return null
    throw error
  }
}
