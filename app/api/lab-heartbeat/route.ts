import { MAX_BODY_BYTES, parseHeartbeat, verify } from "@/lib/lab/heartbeat"
import { lastSignedAt, redisConfig, writeLabStatus } from "@/lib/lab/store"

export const dynamic = "force-dynamic"

const reply = (status: number, error?: string) =>
  error ? Response.json({ error }, { status }) : new Response(null, { status })

/**
 * Receives the homelab's heartbeat: a small JSON list of public machine names with
 * online/uptime, POSTed every few minutes by scripts/lab-heartbeat/ on the cluster.
 *
 * Headers: `x-lab-timestamp` (unix seconds) and `x-lab-signature`, a hex HMAC-SHA256 of
 * `${timestamp}.${body}` with LAB_HEARTBEAT_SECRET. Requests outside a 5-minute window, with a
 * bad signature, a malformed body, or a timestamp not newer than the stored one are refused.
 * Nothing on the lab is reachable from here: the lab only ever calls out.
 */
export async function POST(request: Request) {
  const secret = process.env.LAB_HEARTBEAT_SECRET
  if (!secret || !redisConfig(process.env)) return reply(501, "Heartbeat not configured")

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return reply(413, "Too large")
  }
  const body = await request.text()
  if (body.length > MAX_BODY_BYTES) return reply(413, "Too large")

  const timestamp = request.headers.get("x-lab-timestamp")
  if (!verify(secret, timestamp, request.headers.get("x-lab-signature"), body)) {
    return reply(401, "Bad signature")
  }

  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    return reply(400, "Malformed JSON")
  }
  const nodes = parseHeartbeat(json)
  if (!nodes) return reply(400, "Malformed heartbeat")

  const signedAt = Number(timestamp)
  if (signedAt <= (await lastSignedAt())) return reply(409, "Stale or replayed heartbeat")

  try {
    await writeLabStatus({ nodes, receivedAt: new Date().toISOString(), signedAt })
  } catch {
    return reply(502, "Could not store heartbeat")
  }
  return reply(204)
}
