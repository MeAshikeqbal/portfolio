import { getNow, getPosts, getProjects } from "@/lib/api"
import { llmsText } from "@/lib/llms"

// Prerendered; refreshed by `<SanityLive />` tag revalidation and the Sanity webhook.
export const dynamic = "force-static"
// Refreshed with the content, and at least hourly.
export const revalidate = 3600

/** llmstxt.org: the site, and where its plain-text copies are (lib/llms.ts). */
export async function GET() {
  const [posts, projects, now] = await Promise.all([
    getPosts("en"),
    getProjects("en"),
    getNow("en"),
  ])
  return new Response(llmsText({ posts, projects, hasNow: Boolean(now?.body?.length) }), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  })
}
