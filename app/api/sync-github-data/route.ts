import { revalidatePages } from "@/lib/revalidate"
import { type NextRequest, NextResponse } from "next/server"
import { isCronAuthorized } from "@/lib/cron"
import { syncProjects } from "@/lib/github-sync"
import { GITHUB_PROJECTS_QUERY } from "@/sanity/lib/queries"
import { writeClient } from "@/sanity/lib/write-client"

export const maxDuration = 60

/**
 * Syncs GitHub stats and READMEs onto every project with a repo URL. New repositories are
 * not added automatically: projects are curated by hand in the Studio.
 *
 * Called daily by Vercel Cron (GET, see vercel.json) with `Authorization: Bearer $CRON_SECRET`.
 */
async function sync(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const results: string[] = []
  const errors: string[] = []

  // `raw` includes drafts, so draft-only projects are kept in sync too.
  const projects = await writeClient.fetch(GITHUB_PROJECTS_QUERY, {}, { perspective: "raw" })

  for (const result of await syncProjects(projects)) {
    if (result.ok) results.push(`${result.message} ${result.title}`)
    else errors.push(`${result.title}: ${result.message}`)
  }

  revalidatePages("/projects", "/projects/[slug]", "/")

  return NextResponse.json(
    { message: "GitHub data sync completed", results, errors },
    { status: errors.length > 0 && results.length === 0 ? 500 : 200 },
  )
}

export const GET = sync
export const POST = sync
