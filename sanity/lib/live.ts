import { defineLive } from "next-sanity/live"

import { client } from "./client"
import { readToken } from "./token"

/**
 * `sanityFetch` tags every query with Sanity sync tags; `<SanityLive />` (rendered in the
 * public layout) listens to the Live Content API and revalidates those tags when content
 * changes, so pages update without a redeploy.
 *
 * In draft mode (enabled from the Studio's Presentation tool) `sanityFetch` reads drafts with
 * the server token, and `<SanityLive includeDrafts />` streams draft edits to the previewing
 * browser. The browser only receives the token while draft mode is on.
 */
export const { sanityFetch, SanityLive } = defineLive({
  client,
  serverToken: readToken || false,
  browserToken: readToken || false,
})
