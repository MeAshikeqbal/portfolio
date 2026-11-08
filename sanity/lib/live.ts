import { defineLive } from "next-sanity/live"

import { client } from "./client"

/**
 * `sanityFetch` tags every query with Sanity sync tags; `<SanityLive />` (rendered
 * in the root layout) listens to the Live Content API and revalidates those tags
 * when published content changes, so pages update without a redeploy.
 */
export const { sanityFetch, SanityLive } = defineLive({
  client,
  serverToken: false,
  browserToken: false,
})
