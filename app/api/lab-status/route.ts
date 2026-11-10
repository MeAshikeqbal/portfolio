import { readLabStatus } from "@/lib/lab/store"
import { toPublicStatus } from "@/lib/lab/public"

export const dynamic = "force-dynamic"

/**
 * The homelab's live status for Homecave, the hero and the system bar: per node its latest
 * anonymized report, 24h of 15-minute buckets and 24h availability. `null` until the lab has
 * reported. CDN-cached for 30 seconds (the agents report every 30).
 */
export async function GET() {
  const status = await readLabStatus()
  return Response.json(status ? toPublicStatus(status) : null, {
    headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=30" },
  })
}
