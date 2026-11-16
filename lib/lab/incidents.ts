/**
 * The lab's reliability record: the things whose state is tracked over time ("entities"), the
 * transitions between those states (incidents) and daily up/total rollups (90-day uptime bars).
 *
 * Shared by server and client, so pure functions and types only. Everything here is built from
 * the allowlisted heartbeat (public names and enums), never from anything else the lab knows.
 */
import type { LabNode } from "./types"

/** What can have an incident. */
export type EntityKind = "node" | "svc" | "pool" | "wan" | "backup"

/** The one WAN entity's public name. */
export const INTERNET = "Internet"
/** The one backup entity's public name (backup rounds are cluster-wide). */
export const BACKUPS = "Backups"

/** One entity's current reading from a heartbeat, as the store's script receives it. */
export interface EntityReading {
  /** `kind:name`; pools are `pool:<node>/<label>` (labels repeat across nodes). */
  id: string
  state: string
  /** Counts towards the uptime bars when sampled: 1 up, 0 down; undefined for no bar. */
  bar?: 0 | 1
}

/** The state that ends an incident, per kind. Any other state is one. */
const GOOD: Record<EntityKind, string> = {
  node: "up",
  svc: "up",
  pool: "ONLINE",
  wan: "up",
  backup: "ok",
}

const KINDS = new Set<EntityKind>(["node", "svc", "pool", "wan", "backup"])

export function parseEntityId(
  id: string,
): { kind: EntityKind; name: string; node?: string } | null {
  const colon = id.indexOf(":")
  if (colon < 1) return null
  const kind = id.slice(0, colon) as EntityKind
  if (!KINDS.has(kind)) return null
  const rest = id.slice(colon + 1)
  if (!rest) return null
  if (kind === "pool") {
    const slash = rest.indexOf("/")
    if (slash < 1 || slash === rest.length - 1) return null
    return { kind, node: rest.slice(0, slash), name: rest.slice(slash + 1) }
  }
  return { kind, name: rest }
}

export function isBadState(kind: EntityKind, state: string): boolean {
  return state !== GOOD[kind]
}

/** Every entity a node's own report speaks for. */
export function entitiesFor(node: LabNode): EntityReading[] {
  const out: EntityReading[] = [
    { id: `node:${node.name}`, state: node.online ? "up" : "down", bar: node.online ? 1 : 0 },
  ]
  for (const service of node.services ?? []) {
    out.push({
      id: `svc:${service.name}`,
      state: service.up ? "up" : "down",
      bar: service.up ? 1 : 0,
    })
  }
  for (const store of node.storage ?? []) {
    // Backup stores have no measured health; pools without a reading claim nothing.
    if (store.kind === "pool" && store.health) {
      out.push({ id: `pool:${node.name}/${store.label}`, state: store.health })
    }
  }
  if (node.wan) {
    // Every probe lost is the line being down; latency alone is never an outage.
    const up = node.wan.lossPct < 100
    out.push({ id: `wan:${INTERNET}`, state: up ? "up" : "down", bar: up ? 1 : 0 })
  }
  if (node.backup) out.push({ id: `backup:${BACKUPS}`, state: node.backup.status })
  return out
}

/** A peer seen offline by a reporting node: it's down, and that counts against its uptime. */
export function peerDown(name: string): EntityReading {
  return { id: `node:${name}`, state: "down", bar: 0 }
}

/** The script's wire format: one reading per line, `id \t state \t bar`. */
export function encodeReadings(readings: EntityReading[]): string {
  return readings.map((r) => `${r.id}\t${r.state}\t${r.bar ?? ""}`).join("\n")
}

/** A stored transition (`t \t id \t from \t to \t seconds in "from"`); `to` "nodata" is a gap. */
export interface LabEvent {
  /** Epoch seconds. For a gap, when the node was last heard from. */
  t: number
  id: string
  from: string
  to: string
  /** Seconds spent in `from` (for a gap, how long the node was silent). */
  d: number
}

export function parseEvent(raw: unknown): LabEvent | null {
  if (typeof raw !== "string") return null
  const [t, id, from, to, d, ...rest] = raw.split("\t")
  if (rest.length || !id || !from || !to) return null
  const event = { t: Number(t), id, from, to, d: Number(d) }
  return Number.isFinite(event.t) && Number.isFinite(event.d) && event.d >= 0 ? event : null
}

/** A stored current state (`state|since|seen`, epoch seconds). */
export interface EntityState {
  state: string
  since: number
  seen: number
}

export function parseState(raw: unknown): EntityState | null {
  if (typeof raw !== "string") return null
  const match = /^([^|]+)\|(\d+)\|(\d+)$/.exec(raw)
  return match ? { state: match[1], since: Number(match[2]), seen: Number(match[3]) } : null
}

/** One stretch of trouble, resolved or still going. */
export interface LabIncident {
  kind: EntityKind
  /** The public name: a machine, service or pool label ("Internet", "Backups" for those). */
  name: string
  /** The machine a pool is on. */
  node?: string
  /** The bad state: "down", "nodata" (silent), a pool health, "failed"/"warnings". */
  state: string
  /** Epoch seconds. */
  start: number
  /** Epoch seconds; null while it's still going. */
  end: number | null
}

/** Events are kept 30 days; ongoing ones regardless, as long as the entity still reports. */
export const EVENTS_KEEP_S = 30 * 86_400
/** A current state nobody has reported for a day is a leftover (a renamed service), not news. */
const STATE_SEEN_S = 86_400

/**
 * Incidents, ongoing first, then newest first: every transition out of a bad state (or a gap) is a resolved one,
 * and every entity currently in a bad state is an ongoing one.
 */
export function buildIncidents(
  events: LabEvent[],
  states: Record<string, EntityState>,
  nowS: number,
): LabIncident[] {
  const out: LabIncident[] = []
  for (const e of events) {
    const entity = parseEntityId(e.id)
    if (!entity || nowS - e.t > EVENTS_KEEP_S) continue
    if (e.to === "nodata") {
      out.push({ ...entity, state: "nodata", start: e.t, end: e.t + e.d })
    } else if (isBadState(entity.kind, e.from)) {
      out.push({ ...entity, state: e.from, start: e.t - e.d, end: e.t })
    }
  }
  for (const [id, s] of Object.entries(states)) {
    const entity = parseEntityId(id)
    if (!entity || !isBadState(entity.kind, s.state) || nowS - s.seen > STATE_SEEN_S) continue
    out.push({ ...entity, state: s.state, start: s.since, end: null })
  }
  // Ongoing first, then by when each began (the time the log shows).
  return out.sort((a, b) => Number(a.end !== null) - Number(b.end !== null) || b.start - a.start)
}

/** Days shown on the uptime bars. */
export const UPTIME_DAYS = 90
/** 5-minute samples in a full day. */
export const SAMPLES_PER_DAY = 288

/** "2026-11-16" for a time, in UTC (the site's dates are all UTC). */
export function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** The last `count` UTC days, oldest first, ending today. */
export function lastDays(now: Date, count = UPTIME_DAYS): string[] {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Array.from({ length: count }, (_, i) => dayKey(today - (count - 1 - i) * 86_400_000))
}

export interface UptimeDay {
  /** Samples up, and samples taken. */
  up: number
  total: number
}

export interface UptimeRow {
  kind: "node" | "svc" | "wan"
  name: string
  /** One per day in `LabReliability.days`, null where nothing was sampled. */
  days: (UptimeDay | null)[]
  /** Share of all samples that were up, over the days with data; null with under a day. */
  pct: number | null
}

/** How a day's bar reads: all up, partly down, mostly down, or nothing measured. */
export type DayLevel = "up" | "partial" | "down" | "none"

export function dayLevel(day: UptimeDay | null): DayLevel {
  if (!day || day.total === 0) return "none"
  if (day.up >= day.total) return "up"
  return day.up / day.total >= 0.5 ? "partial" : "down"
}

/** Builds the uptime rows from the daily rollups (`{ "node:Tower:u": "280", … }` per day). */
export function buildUptime(rollups: Record<string, string>[], days: string[]): UptimeRow[] {
  const rows = new Map<string, UptimeRow>()
  rollups.forEach((hash, index) => {
    for (const [field, raw] of Object.entries(hash)) {
      const match = /^(.*):(u|n)$/.exec(field)
      const entity = match && parseEntityId(match[1])
      if (!match || !entity || entity.kind === "pool" || entity.kind === "backup") continue
      const count = Number(raw)
      if (!Number.isFinite(count) || count < 0) continue
      let row = rows.get(match[1])
      if (!row) {
        row = { kind: entity.kind, name: entity.name, days: days.map(() => null), pct: null }
        rows.set(match[1], row)
      }
      const day = (row.days[index] ??= { up: 0, total: 0 })
      if (match[2] === "u") day.up = count
      else day.total = count
    }
  })
  for (const row of rows.values()) {
    let up = 0
    let total = 0
    for (const day of row.days) {
      if (!day) continue
      day.up = Math.min(day.up, day.total)
      up += day.up
      total += day.total
    }
    // A day's worth of samples before claiming a percentage.
    row.pct = total >= SAMPLES_PER_DAY ? Math.floor((up / total) * 1000) / 10 : null
  }
  const order = { node: 0, wan: 1, svc: 2 }
  return [...rows.values()].sort(
    (a, b) => order[a.kind] - order[b.kind] || a.name.localeCompare(b.name),
  )
}

export interface LabReliability {
  incidents: LabIncident[]
  /** The UTC days the bars cover, oldest first. */
  days: string[]
  uptime: UptimeRow[]
}

/** The public shape, rebuilt field by field like `toPublicStatus`. */
export function toPublicReliability(r: LabReliability): LabReliability {
  return {
    incidents: r.incidents.map((i) => ({
      kind: i.kind,
      name: i.name,
      ...(i.node !== undefined && { node: i.node }),
      state: i.state,
      start: i.start,
      end: i.end,
    })),
    days: [...r.days],
    uptime: r.uptime.map((row) => ({
      kind: row.kind,
      name: row.name,
      days: row.days.map((d) => (d ? { up: d.up, total: d.total } : null)),
      pct: row.pct,
    })),
  }
}

/** A post that writes up an incident (its `incident` date, from the Studio). */
export interface Writeup {
  title: string
  slug: string
  /** "2026-11-09" */
  incident: string
}

const shiftDay = (day: string, by: number) =>
  dayKey(Date.parse(`${day}T00:00:00Z`) + by * 86_400_000)

/**
 * The post written about an incident: one whose incident date falls within the incident's UTC
 * days, give or take a day (the author picks a date in their own time zone). Null when none.
 */
export function writeupFor(
  incident: Pick<LabIncident, "start" | "end">,
  writeups: readonly Writeup[],
  nowS: number,
): Writeup | null {
  const from = shiftDay(dayKey(incident.start * 1000), -1)
  const to = shiftDay(dayKey((incident.end ?? nowS) * 1000), 1)
  return writeups.find((w) => w.incident >= from && w.incident <= to) ?? null
}
