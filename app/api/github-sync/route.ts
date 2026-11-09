import { revalidatePath } from "next/cache"
import { type NextRequest, NextResponse } from "next/server"

import { hasFreshSyncRequest, parseSyncIds, type SyncResponse } from "@/lib/github-sync-request"
import { syncProjects } from "@/lib/github-sync"
import { GITHUB_SYNC_REQUESTS_QUERY } from "@/sanity/lib/queries"
import { writeClient } from "@/sanity/lib/write-client"

export const maxDuration = 60

/**
 * On-demand GitHub sync for the Studio's "Sync from GitHub" action and dashboard button.
 *
 * Public on purpose: it only syncs projects whose `githubSyncRequestedAt` was stamped in the
 * last few minutes (which takes write access to the dataset) and clears the stamp, so a call
 * without a matching Studio request, or a replay, does nothing.
 */
export async function POST(req: NextRequest) {
  const ids = parseSyncIds(await req.json().catch(() => null))
  if (!ids) {
    return NextResponse.json({ error: "Expected { ids: string[] }" }, { status: 400 })
  }

  const docs = await writeClient.fetch(GITHUB_SYNC_REQUESTS_QUERY, { ids }, { perspective: "raw" })
  const pending = docs.filter((doc) => hasFreshSyncRequest(doc))
  const results = await syncProjects(pending)

  if (results.some((result) => result.ok)) {
    revalidatePath("/projects")
    revalidatePath("/projects/[slug]", "page")
    revalidatePath("/")
  }

  const body: SyncResponse = {
    synced: results.filter((r) => r.ok).map((r) => r.id),
    failed: results.filter((r) => !r.ok).map((r) => `${r.title}: ${r.message}`),
    skipped: ids.length - pending.length,
  }
  return NextResponse.json(body)
}
