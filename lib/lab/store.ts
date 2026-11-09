import "server-only"

import type { Env, Fetch } from "@/lib/live/http"
import type { LabStatus } from "./types"

const KEY = "lab:heartbeat"
const TIMEOUT_MS = 3000

/** Upstash REST credentials: the Upstash names, or the ones Vercel's integration sets. */
export function redisConfig(env: Env): { url: string; token: string } | null {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null
}

/** Runs one Redis command over Upstash's REST API. Throws on transport or Redis errors. */
async function command(
  config: { url: string; token: string },
  args: (string | number)[],
  fetchImpl: Fetch,
): Promise<unknown> {
  const response = await fetchImpl(config.url, {
    method: "POST",
    headers: { authorization: `Bearer ${config.token}`, "content-type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const json = (await response.json()) as { result?: unknown; error?: string }
  if (!response.ok || json.error) throw new Error(json.error ?? `Upstash ${response.status}`)
  return json.result
}

/** The stored heartbeat, or null when unconfigured, empty, unreachable or malformed. */
export async function readLabStatus(
  env: Env = process.env,
  fetchImpl: Fetch = fetch,
): Promise<LabStatus | null> {
  const config = redisConfig(env)
  if (!config) return null
  try {
    const raw = await command(config, ["GET", KEY], fetchImpl)
    if (typeof raw !== "string") return null
    const value = JSON.parse(raw) as LabStatus
    return Array.isArray(value?.nodes) && typeof value.receivedAt === "string" ? value : null
  } catch {
    return null
  }
}

/** Stores a heartbeat; it expires on its own after a day so a dead lab can't linger. */
export async function writeLabStatus(
  status: LabStatus & { signedAt: number },
  env: Env = process.env,
  fetchImpl: Fetch = fetch,
): Promise<void> {
  const config = redisConfig(env)
  if (!config) throw new Error("Upstash is not configured")
  await command(config, ["SET", KEY, JSON.stringify(status), "EX", 86_400], fetchImpl)
}

/** The signed timestamp of the stored heartbeat, for replay protection (0 when none). */
export async function lastSignedAt(env: Env = process.env, fetchImpl: Fetch = fetch) {
  const config = redisConfig(env)
  if (!config) return 0
  try {
    const raw = await command(config, ["GET", KEY], fetchImpl)
    const value = typeof raw === "string" ? (JSON.parse(raw) as { signedAt?: number }) : null
    return typeof value?.signedAt === "number" ? value.signedAt : 0
  } catch {
    return 0
  }
}
