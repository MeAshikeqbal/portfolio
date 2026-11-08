import { timingSafeEqual } from "crypto"
import { revalidatePath } from "next/cache"
import { type NextRequest, NextResponse } from "next/server"
import {
  fetchGitHubData,
  fetchOwnedPublicRepositories,
  normalizeRepoUrl,
} from "@/lib/fetch-github-data"
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

/** Sanity document IDs allow letters, digits, `-` and `_`. */
function draftIdForRepo(name: string): string {
  return `drafts.project-${name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-")}`
}

/**
 * Syncs GitHub stats onto every project with a repo URL, and creates a draft
 * project for each new public repository so it can be reviewed in the Studio.
 *
 * Called daily by Vercel Cron (GET, see vercel.json) with `Authorization: Bearer $CRON_SECRET`.
 */
async function sync(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const results: string[] = []
  const errors: string[] = []

  // `raw` includes drafts, so draft-only projects are updated and not re-created.
  const projects = await writeClient.fetch(GITHUB_PROJECTS_QUERY, {}, { perspective: "raw" })
  const knownRepos = new Set(
    projects.flatMap((p) => (p.github ? [normalizeRepoUrl(p.github)] : [])),
  )

  for (const project of projects) {
    if (!project.github) continue
    const githubData = await fetchGitHubData(project.github)
    if (!githubData) {
      errors.push(`No GitHub data for ${project.title ?? project._id}`)
      continue
    }
    try {
      await writeClient.patch(project._id).set({ githubData }).commit()
      results.push(`Updated ${project.title ?? project._id}`)
    } catch (error) {
      errors.push(`Failed to update ${project.title ?? project._id}: ${String(error)}`)
    }
  }

  for (const repo of await fetchOwnedPublicRepositories()) {
    if (knownRepos.has(normalizeRepoUrl(repo.url))) continue
    try {
      await writeClient.createIfNotExists({
        _id: draftIdForRepo(repo.name),
        _type: "project",
        title: repo.name,
        description: repo.description ?? "",
        github: repo.url,
        url: repo.homepage || undefined,
        tech: repo.language ? [repo.language] : [],
        githubData: {
          stars: repo.stars,
          commits: 0,
          license: "Not specified",
          language: repo.language ?? null,
          topics: repo.topics,
          pushedAt: repo.pushedAt ?? null,
        },
      })
      results.push(`Draft for new repository ${repo.name}`)
    } catch (error) {
      errors.push(`Failed to create draft for ${repo.name}: ${String(error)}`)
    }
  }

  revalidatePath("/projects")
  revalidatePath("/")

  return NextResponse.json(
    { message: "GitHub data sync completed", results, errors },
    { status: errors.length > 0 && results.length === 0 ? 500 : 200 },
  )
}

export const GET = sync
export const POST = sync
