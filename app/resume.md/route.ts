import { getResumeMarkdown } from "@/lib/api"

export const dynamic = "force-static"

/** The résumé as Markdown, generated from the site's content (lib/resume.ts). */
export async function GET() {
  return new Response(await getResumeMarkdown(), {
    headers: { "content-type": "text/markdown; charset=utf-8", "x-robots-tag": "noindex" },
  })
}
