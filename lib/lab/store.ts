import "server-only"

import type { Env, Fetch } from "@/lib/live/http"
import {
  buildIncidents,
  buildUptime,
  dayKey,
  encodeReadings,
  entitiesFor,
  lastDays,
  parseEvent,
  parseState,
  peerDown,
  UPTIME_DAYS,
  type EntityReading,
  type EntityState,
  type LabEvent,
  type LabReliability,
} from "./incidents"
import type { LabHistory, LabNode, LabNodeStatus, LabStatus } from "./types"

const TIMEOUT_MS = 3000
const NODES_KEY = "lab:nodes"
/** One history sample per node per 5 minutes, 24h of them. */
export const HISTORY_EVERY_MS = 5 * 60_000
export const HISTORY_MAX = 288
/** Latest reports are kept a month, so a long outage still reads "down", not "unknown". */
const LATEST_TTL_S = 30 * 86_400
const BUCKET_MS = 15 * 60_000
const DAY_MS = 86_400_000

const STATE_KEY = "lab:state"
const EVENTS_KEY = "lab:events"
const dayKeyName = (day: string) => `lab:day:${day}`
/** Newest transitions kept (they're also dropped from view after 30 days). */
export const EVENTS_MAX = 500
/** Daily rollups live a day longer than the bars reach back. */
const DAY_TTL_S = (UPTIME_DAYS + 1) * 86_400
/** A node silent this long and back again is logged as a gap ("no data from Tower, 12 min"). */
export const GAP_S = 180

const keys = (name: string) => [
  `lab:node:${name}`,
  `lab:signed:${name}`,
  `lab:hist:${name}`,
  `lab:histT:${name}`,
]

/**
 * One EVAL per heartbeat (Upstash bills per command). For each entry: skip it if this node
 * already has a heartbeat signed at or after this one (replay); store the latest report; add
 * a history sample when the last is ≥ 5 minutes old, keeping 288. Entries with an empty
 * report are peers seen offline: they only get a history sample, so downtime is recorded
 * even though the silent node can't report it (and nothing, if the heartbeat was a replay).
 *
 * Then each entry's entity readings (`id \t state \t bar` lines): a state that differs from the
 * stored one is a transition, appended to `lab:events` with the seconds spent in the old state;
 * a node back after more than GAP_S of silence gets a gap event. With each history sample, the
 * readings that have bars add to today's rollup (`<id>:n` samples, `<id>:u` up). Returns the
 * number of nodes written, then the new events (for alerts).
 */
export const WRITE_SCRIPT = `
local signedAt = tonumber(ARGV[1])
local now = tonumber(ARGV[2])
local every = tonumber(ARGV[3])
local maxh = tonumber(ARGV[4])
local ttl = tonumber(ARGV[5])
local gap = tonumber(ARGV[6])
local maxe = tonumber(ARGV[7])
local dayttl = tonumber(ARGV[8])
local nowS = math.floor(now / 1000)
local written = 0
local reports = 0
local events = {}
local rolled = false
local function record(t, id, from, to, d)
  local e = t .. '\\t' .. id .. '\\t' .. from .. '\\t' .. to .. '\\t' .. d
  redis.call('LPUSH', KEYS[3], e)
  events[#events + 1] = e
end
local entries = (#KEYS - 4) / 4
for i = 0, entries - 1 do
  local k = 5 + i * 4
  local a = 9 + i * 4
  local name, latest, sample, readings = ARGV[a], ARGV[a + 1], ARGV[a + 2], ARGV[a + 3]
  local proceed = true
  if latest ~= '' then
    reports = reports + 1
    local prev = tonumber(redis.call('GET', KEYS[k + 1]) or '0') or 0
    if prev >= signedAt then
      proceed = false
    else
      redis.call('SET', KEYS[k + 1], signedAt, 'EX', 172800)
      redis.call('SET', KEYS[k], latest, 'EX', ttl)
      redis.call('SADD', KEYS[1], name)
      written = written + 1
    end
  elseif reports > 0 and written == 0 then
    proceed = false
  end
  if proceed then
    local lastT = tonumber(redis.call('GET', KEYS[k + 3]) or '0') or 0
    local sampled = now - lastT >= every
    if sampled then
      redis.call('RPUSH', KEYS[k + 2], sample)
      redis.call('LTRIM', KEYS[k + 2], -maxh, -1)
      redis.call('EXPIRE', KEYS[k + 2], 100000)
      redis.call('SET', KEYS[k + 3], now, 'EX', 100000)
    end
    for line in string.gmatch(readings, '[^\\n]+') do
      local id, state, bar = string.match(line, '^([^\\t]+)\\t([^\\t]+)\\t([01]?)$')
      if id then
        local cur = redis.call('HGET', KEYS[2], id)
        local since = nowS
        if cur then
          local pstate, psince, pseen = string.match(cur, '^([^|]+)|(%d+)|(%d+)$')
          if pstate then
            psince = tonumber(psince)
            pseen = tonumber(pseen)
            if pstate ~= state then
              record(nowS, id, pstate, state, math.max(0, nowS - psince))
            else
              since = psince
              if latest ~= '' and state == 'up' and string.sub(id, 1, 5) == 'node:' and nowS - pseen > gap then
                record(pseen, id, 'up', 'nodata', nowS - pseen)
              end
            end
          end
        end
        redis.call('HSET', KEYS[2], id, state .. '|' .. since .. '|' .. nowS)
        if sampled and bar ~= '' then
          redis.call('HINCRBY', KEYS[4], id .. ':n', 1)
          if bar == '1' then redis.call('HINCRBY', KEYS[4], id .. ':u', 1) end
          rolled = true
        end
      end
    end
  end
end
if #events > 0 then redis.call('LTRIM', KEYS[3], 0, maxe - 1) end
if rolled then redis.call('EXPIRE', KEYS[4], dayttl) end
local out = { written }
for _, e in ipairs(events) do out[#out + 1] = e end
return out
`

/** The reliability record in one EVAL: current states, recent events, the daily rollups. */
export const RELIABILITY_SCRIPT = `
local out = { redis.call('HGETALL', KEYS[1]), redis.call('LRANGE', KEYS[2], 0, tonumber(ARGV[1]) - 1) }
for i = 3, #KEYS do out[#out + 1] = redis.call('HGETALL', KEYS[i]) end
return out
`

/** Every node's latest report and raw history, in one EVAL. */
export const READ_SCRIPT = `
local out = {}
for i = 1, #KEYS, 2 do
  local v = redis.call('GET', KEYS[i])
  if not v then v = '' end
  out[#out + 1] = v
  out[#out + 1] = redis.call('LRANGE', KEYS[i + 1], 0, -1)
end
return out
`

/** Upstash REST credentials: the Upstash names, or the ones Vercel's integration sets. */
export function redisConfig(env: Env): { url: string; token: string } | null {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null
}

interface CommandOptions {
  fetchImpl: Fetch
  /** Server-render reads: let Next cache the answer for this many seconds. */
  revalidate?: number
}

/** Runs one Redis command over Upstash's REST API. Throws on transport or Redis errors. */
async function command(
  config: { url: string; token: string },
  args: (string | number)[],
  { fetchImpl, revalidate }: CommandOptions,
): Promise<unknown> {
  const response = await fetchImpl(config.url, {
    method: "POST",
    headers: { authorization: `Bearer ${config.token}`, "content-type": "application/json" },
    body: JSON.stringify(args.map(String)),
    ...(revalidate ? { next: { revalidate } } : { cache: "no-store" as const }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const json = (await response.json()) as { result?: unknown; error?: string }
  if (!response.ok || json.error) throw new Error(json.error ?? `Upstash ${response.status}`)
  return json.result
}

interface Sample {
  t: number
  c?: number | null
  m?: number | null
  i?: number | null
  o?: number | null
  /** CPU °C, GPU %, edge requests/min (only from nodes that report them). */
  tc?: number | null
  g?: number | null
  e?: number | null
  u: 0 | 1
}

const SERIES = ["c", "m", "i", "o", "tc", "g", "e"] as const

/** What a stored heartbeat did: nodes written (0 means a replay) and the transitions it logged. */
export interface WriteResult {
  written: number
  events: LabEvent[]
}

/**
 * Stores one heartbeat. `nodes` are the reporting node(s); peers a v2 node sees offline get
 * a down sample. Returns how many nodes were written and the incidents' transitions it logged.
 */
export async function writeHeartbeat(
  nodes: LabNode[],
  signedAt: number,
  now: Date,
  env: Env = process.env,
  fetchImpl: Fetch = fetch,
): Promise<WriteResult> {
  const config = redisConfig(env)
  if (!config) throw new Error("Upstash is not configured")
  const t = now.getTime()
  const entries: { name: string; latest: string; sample: Sample; readings: EntityReading[] }[] =
    nodes.map((node) => ({
      name: node.name,
      latest: JSON.stringify({ ...node, receivedAt: now.toISOString() }),
      sample: {
        t,
        c: node.cpu?.pct ?? null,
        m: node.mem?.pct ?? null,
        i: node.net?.inKBps ?? null,
        o: node.net?.outKBps ?? null,
        ...(node.temps?.cpuC != null && { tc: node.temps.cpuC }),
        ...(node.gpu && { g: node.gpu.utilPct }),
        ...(node.edge && { e: node.edge.rpm }),
        u: node.online ? 1 : 0,
      },
      readings: entitiesFor(node),
    }))
  const reporting = new Set(nodes.map((n) => n.name))
  for (const node of nodes) {
    for (const peer of node.peers ?? []) {
      if (!peer.online && !reporting.has(peer.name)) {
        entries.push({
          name: peer.name,
          latest: "",
          sample: { t, u: 0 },
          readings: [peerDown(peer.name)],
        })
        reporting.add(peer.name)
      }
    }
  }
  // A gap is longer than the slowest sender's two intervals (the v1 lab reported every 5 min).
  const gap = Math.max(GAP_S, ...nodes.map((n) => (n.interval ?? 300) * 2 + 30))
  const keyList = [
    NODES_KEY,
    STATE_KEY,
    EVENTS_KEY,
    dayKeyName(dayKey(t)),
    ...entries.flatMap((e) => keys(e.name)),
  ]
  const args = [
    signedAt,
    t,
    HISTORY_EVERY_MS,
    HISTORY_MAX,
    LATEST_TTL_S,
    gap,
    EVENTS_MAX,
    DAY_TTL_S,
    ...entries.flatMap((e) => [
      e.name,
      e.latest,
      JSON.stringify(e.sample),
      encodeReadings(e.readings),
    ]),
  ]
  const result = await command(
    config,
    ["EVAL", WRITE_SCRIPT, keyList.length, ...keyList, ...args],
    { fetchImpl },
  )
  const [written, ...events] = Array.isArray(result) ? result : [result]
  return {
    written: Number(written) || 0,
    events: events.map(parseEvent).filter((e): e is LabEvent => e !== null),
  }
}

/** Redis HGETALL's flat [field, value, field, value…] as an object. */
function pairs(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!Array.isArray(raw)) return out
  for (let i = 0; i + 1 < raw.length; i += 2) out[String(raw[i])] = String(raw[i + 1])
  return out
}

/**
 * Incidents (30 days, plus anything still going) and 90 days of uptime bars, in one EVAL.
 * Null when unconfigured or unreachable; empty lists before the first transition or sample.
 */
export async function readLabReliability(
  env: Env = process.env,
  fetchImpl: Fetch = fetch,
  options: { revalidate?: number; now?: Date } = {},
): Promise<LabReliability | null> {
  const config = redisConfig(env)
  if (!config) return null
  const now = options.now ?? new Date()
  const days = lastDays(now, UPTIME_DAYS)
  const keyList = [STATE_KEY, EVENTS_KEY, ...days.map(dayKeyName)]
  try {
    const raw = (await command(
      config,
      ["EVAL", RELIABILITY_SCRIPT, keyList.length, ...keyList, EVENTS_MAX],
      { fetchImpl, revalidate: options.revalidate },
    )) as unknown[]
    if (!Array.isArray(raw)) return null
    const states: Record<string, EntityState> = {}
    for (const [id, value] of Object.entries(pairs(raw[0]))) {
      const state = parseState(value)
      if (state) states[id] = state
    }
    const events = (Array.isArray(raw[1]) ? raw[1] : [])
      .map(parseEvent)
      .filter((e): e is LabEvent => e !== null)
    return {
      incidents: buildIncidents(events, states, Math.floor(now.getTime() / 1000)),
      days,
      uptime: buildUptime(raw.slice(2).map(pairs), days),
    }
  } catch {
    return null
  }
}

/** 15-minute buckets over the last 24h, averaged; availability from the up/down samples. */
export function summarizeHistory(
  samples: Sample[],
  now: Date,
): { history: LabHistory; availability24h: number | null } {
  const end = now.getTime()
  const start = end - DAY_MS
  const count = DAY_MS / BUCKET_MS
  const buckets = Array.from(
    { length: count },
    () =>
      Object.fromEntries(SERIES.map((k) => [k, [] as number[]])) as Record<
        (typeof SERIES)[number],
        number[]
      >,
  )
  let up = 0
  let seen = 0
  for (const s of samples) {
    if (!(s.t > start && s.t <= end)) continue
    seen += 1
    up += s.u
    const b = buckets[Math.min(count - 1, Math.floor((s.t - start) / BUCKET_MS))]
    for (const key of SERIES) {
      const v = s[key]
      if (typeof v === "number") b[key].push(v)
    }
  }
  const avg = (xs: number[]) =>
    xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null
  return {
    history: {
      t: buckets.map((_, k) => start + (k + 1) * BUCKET_MS),
      cpu: buckets.map((b) => avg(b.c)),
      mem: buckets.map((b) => avg(b.m)),
      netIn: buckets.map((b) => avg(b.i)),
      netOut: buckets.map((b) => avg(b.o)),
      temp: buckets.map((b) => avg(b.tc)),
      gpu: buckets.map((b) => avg(b.g)),
      edge: buckets.map((b) => avg(b.e)),
    },
    // An hour of samples before claiming a percentage.
    availability24h: seen >= 12 ? Math.round((up / seen) * 1000) / 10 : null,
  }
}

/** Every node's status, or null when unconfigured, empty, unreachable or malformed. */
export async function readLabStatus(
  env: Env = process.env,
  fetchImpl: Fetch = fetch,
  options: { revalidate?: number; now?: Date } = {},
): Promise<LabStatus | null> {
  const config = redisConfig(env)
  if (!config) return null
  const opts = { fetchImpl, revalidate: options.revalidate }
  try {
    const names = (await command(config, ["SMEMBERS", NODES_KEY], opts)) as unknown
    if (!Array.isArray(names) || names.length === 0) return null
    const list = (names as string[])
      .filter((n) => typeof n === "string")
      .sort()
      .slice(0, 8)
    const keyList = list.flatMap((n) => [`lab:node:${n}`, `lab:hist:${n}`])
    const raw = (await command(
      config,
      ["EVAL", READ_SCRIPT, keyList.length, ...keyList],
      opts,
    )) as unknown[]
    const now = options.now ?? new Date()
    const nodes: LabNodeStatus[] = []
    list.forEach((_, index) => {
      const latest = raw[index * 2]
      const hist = raw[index * 2 + 1]
      if (typeof latest !== "string" || !latest) return
      const node = JSON.parse(latest) as LabNode & { receivedAt: string }
      const samples = (Array.isArray(hist) ? hist : []).flatMap((s) => {
        try {
          return [JSON.parse(String(s)) as Sample]
        } catch {
          return []
        }
      })
      nodes.push({ ...node, ...summarizeHistory(samples, now) })
    })
    return nodes.length > 0 ? { nodes } : null
  } catch {
    return null
  }
}
