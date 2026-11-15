import { timingSafeEqual } from "crypto"
import { revalidatePath } from "next/cache"
import { type NextRequest, NextResponse } from "next/server"
import { syncProjects } from "@/lib/github-sync"
import { GITHUB_PROJECTS_QUERY } from "@/sanity/lib/queries"
import { writeClient } from "@/sanity/lib/write-client"

export const maxDuration = 60

function isAuthorized(req: NextRequest): boolean {
  if (process.env.NODE_ENV === "development") return true
  const secret = process.env.CRON_SECRET
  const header = req.headers.get("authorization")
  if (!secret || !header) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(header)
  return expected.length === received.length && timingSafeEqual(expected, received)
}

/**
 * Syncs GitHub stats and READMEs onto every project with a repo URL. New repositories are
 * not added automatically: projects are curated by hand in the Studio.
 *
 * Called daily by Vercel Cron (GET, see vercel.json) with `Authorization: Bearer $CRON_SECRET`.
 */
async function sync(req: NextRequest) {
  if (!isAuthorized(req)) {
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

  revalidatePath("/projects")
  revalidatePath("/projects/[slug]", "page")
  revalidatePath("/")

  return NextResponse.json(
    { message: "GitHub data sync completed", results, errors },
    { status: errors.length > 0 && results.length === 0 ? 500 : 200 },
  )
}

export const GET = sync
export const POST = sync
