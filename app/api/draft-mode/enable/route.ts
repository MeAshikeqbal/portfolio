import { defineEnableDraftMode } from "next-sanity/draft-mode"
import { client } from "@/sanity/lib/client"
import { readToken } from "@/sanity/lib/token"

/**
 * Called by the Studio's Presentation tool. Validates Sanity's one-time preview secret
 * (using the read token) before turning on draft mode, so it can't be enabled by guessing a URL.
 */
const { GET: enableDraftMode } = defineEnableDraftMode({
  client: client.withConfig({ token: readToken }),
})

export async function GET(request: Request) {
  if (!readToken) {
    return new Response("Draft previews aren't configured: set SANITY_API_READ_TOKEN.", {
      status: 501,
    })
  }
  return enableDraftMode(request)
}
