import { getPostSources } from "@/lib/api"
import { siteConfig } from "@/lib/site"

export const dynamic = "force-static"

/** Every listed post's Markdown (the same bytes as /post/<slug>.md), newest first. */
export async function GET() {
  const posts = await getPostSources()
  const intro = `# ${siteConfig.name}: every post\n\n> ${siteConfig.description}\n`
  return new Response([intro, ...posts].join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  })
}
