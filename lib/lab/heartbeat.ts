import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"
import type { LabNode } from "./types"

/** Heartbeats are a few hundred bytes; anything bigger is not ours. */
export const MAX_BODY_BYTES = 4096
/** How far the lab's clock may be from ours before a signed request is refused. */
export const MAX_SKEW_SECONDS = 300
export const MAX_NODES = 8
/** Public names only: letters, digits, spaces and a little punctuation. No dots, colons or slashes. */
const NAME = /^[A-Za-z0-9][A-Za-z0-9 #_-]{0,31}$/

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

/** The allowlisted node list from a heartbeat body, or null if it's malformed in any way. */
export function parseHeartbeat(json: unknown): LabNode[] | null {
  if (!json || typeof json !== "object") return null
  const nodes = (json as { nodes?: unknown }).nodes
  if (!Array.isArray(nodes) || nodes.length === 0 || nodes.length > MAX_NODES) return null
  const parsed: LabNode[] = []
  for (const node of nodes) {
    if (!node || typeof node !== "object") return null
    const { name, online, uptime } = node as Record<string, unknown>
    if (typeof name !== "string" || !NAME.test(name)) return null
    if (typeof online !== "boolean") return null
    if (typeof uptime !== "number" || !Number.isFinite(uptime) || uptime < 0) return null
    parsed.push({ name, online, uptime: online ? Math.floor(uptime) : 0 })
  }
  if (new Set(parsed.map((n) => n.name)).size !== parsed.length) return null
  return parsed
}
