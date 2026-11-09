import { getLiveActivity } from "@/lib/live"

// Always computed at request time; the CDN caches the response briefly instead.
export const dynamic = "force-dynamic"

/**
 * Live activity for /now and the hero: Spotify, Trakt and Jellyfin stream counts. The CDN
 * serves it for 30s (and stale for another 60s while refreshing), so visitors never hit the
 * upstream APIs directly and their rate limits stay out of reach.
 */
export async function GET() {
  return Response.json(await getLiveActivity(), {
    headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=60" },
  })
}
