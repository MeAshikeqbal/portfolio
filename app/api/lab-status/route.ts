import { readLabStatus } from "@/lib/lab/store"
import type { LabStatus } from "@/lib/lab/types"

export const dynamic = "force-dynamic"

/**
 * The last homelab heartbeat for the hero and /uses: public machine names, online, uptime and
 * when it arrived (freshness is judged in the browser). `null` until the lab has reported.
 * CDN-cached for a minute; the lab only reports every five.
 */
export async function GET() {
  const stored = await readLabStatus()
  // Allowlist: never pass through anything else the store might hold.
  const body: LabStatus | null = stored
    ? {
        nodes: stored.nodes.map(({ name, online, uptime }) => ({ name, online, uptime })),
        receivedAt: stored.receivedAt,
      }
    : null
  return Response.json(body, {
    headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=60" },
  })
}
