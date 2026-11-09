import type { SanityClient } from "sanity"

import type { SyncResponse } from "../../lib/github-sync-request"

/**
 * Stamps a sync request on each document (with the editor's own permissions), then asks the
 * site to run it. See lib/github-sync-request.ts for why this needs no secret in the browser.
 */
export async function requestGitHubSync(
  client: SanityClient,
  ids: string[],
): Promise<SyncResponse> {
  const now = new Date().toISOString()
  const tx = client.transaction()
  for (const id of ids) tx.patch(id, (patch) => patch.set({ githubSyncRequestedAt: now }))
  await tx.commit({ visibility: "sync" })

  const response = await fetch("/api/github-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  })
  if (!response.ok) throw new Error(`The site answered ${response.status}`)
  return (await response.json()) as SyncResponse
}

/** One-line summary for a toast. */
export function describeSync(result: SyncResponse, projects: number): string {
  if (result.failed.length) return result.failed.join("; ")
  return projects === 1 ? "Stars, commits and language updated." : `Updated ${projects} projects.`
}
