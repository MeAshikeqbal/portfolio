import "server-only"

import type { Env, Fetch } from "@/lib/live/http"
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
 * even though the silent node can't report it.
 */
export const WRITE_SCRIPT = `
local signedAt = tonumber(ARGV[1])
local now = tonumber(ARGV[2])
local every = tonumber(ARGV[3])
local maxh = tonumber(ARGV[4])
local ttl = tonumber(ARGV[5])
local written = 0
local entries = (#KEYS - 1) / 4
for i = 0, entries - 1 do
  local k = 2 + i * 4
  local a = 6 + i * 3
  local name, latest, sample = ARGV[a], ARGV[a + 1], ARGV[a + 2]
  local proceed = true
  if latest ~= '' then
    local prev = tonumber(redis.call('GET', KEYS[k + 1]) or '0') or 0
    if prev >= signedAt then
      proceed = false
    else
      redis.call('SET', KEYS[k + 1], signedAt, 'EX', 172800)
      redis.call('SET', KEYS[k], latest, 'EX', ttl)
      redis.call('SADD', KEYS[1], name)
      written = written + 1
    end
  end
  if proceed then
    local lastT = tonumber(redis.call('GET', KEYS[k + 3]) or '0') or 0
    if now - lastT >= every then
      redis.call('RPUSH', KEYS[k + 2], sample)
      redis.call('LTRIM', KEYS[k + 2], -maxh, -1)
      redis.call('EXPIRE', KEYS[k + 2], 100000)
      redis.call('SET', KEYS[k + 3], now, 'EX', 100000)
    end
  end
end
return written
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
  u: 0 | 1
}

/**
 * Stores one heartbeat. `nodes` are the reporting node(s); peers a v2 node sees offline get
 * a down sample. Returns how many nodes were written (0 means a replay).
 */
export async function writeHeartbeat(
  nodes: LabNode[],
  signedAt: number,
  now: Date,
  env: Env = process.env,
  fetchImpl: Fetch = fetch,
): Promise<number> {
  const config = redisConfig(env)
  if (!config) throw new Error("Upstash is not configured")
  const t = now.getTime()
  const entries: { name: string; latest: string; sample: Sample }[] = nodes.map((node) => ({
    name: node.name,
    latest: JSON.stringify({ ...node, receivedAt: now.toISOString() }),
    sample: {
      t,
      c: node.cpu?.pct ?? null,
      m: node.mem?.pct ?? null,
      i: node.net?.inKBps ?? null,
      o: node.net?.outKBps ?? null,
      u: node.online ? 1 : 0,
    },
  }))
  const reporting = new Set(nodes.map((n) => n.name))
  for (const node of nodes) {
    for (const peer of node.peers ?? []) {
      if (!peer.online && !reporting.has(peer.name)) {
        entries.push({ name: peer.name, latest: "", sample: { t, u: 0 } })
        reporting.add(peer.name)
      }
    }
  }
  const keyList = [NODES_KEY, ...entries.flatMap((e) => keys(e.name))]
  const args = [
    signedAt,
    t,
    HISTORY_EVERY_MS,
    HISTORY_MAX,
    LATEST_TTL_S,
    ...entries.flatMap((e) => [e.name, e.latest, JSON.stringify(e.sample)]),
  ]
  const result = await command(
    config,
    ["EVAL", WRITE_SCRIPT, keyList.length, ...keyList, ...args],
    {
      fetchImpl,
    },
  )
  return Number(result) || 0
}

/** 15-minute buckets over the last 24h, averaged; availability from the up/down samples. */
export function summarizeHistory(
  samples: Sample[],
  now: Date,
): { history: LabHistory; availability24h: number | null } {
  const end = now.getTime()
  const start = end - DAY_MS
  const count = DAY_MS / BUCKET_MS
  const buckets = Array.from({ length: count }, () => ({
    c: [] as number[],
    m: [] as number[],
    i: [] as number[],
    o: [] as number[],
  }))
  let up = 0
  let seen = 0
  for (const s of samples) {
    if (!(s.t > start && s.t <= end)) continue
    seen += 1
    up += s.u
    const b = buckets[Math.min(count - 1, Math.floor((s.t - start) / BUCKET_MS))]
    for (const key of ["c", "m", "i", "o"] as const) {
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
