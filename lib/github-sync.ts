import "server-only"

import { fetchGitHubData, githubPatchFields, type GitHubData } from "@/lib/fetch-github-data"
import { writeClient } from "@/sanity/lib/write-client"

export interface SyncableProject {
  _id: string
  title?: string | null
  github?: string | null
}

export interface ProjectSyncResult {
  id: string
  title: string
  ok: boolean
  message: string
}

/**
 * Fetches GitHub stats for each project and patches them onto the document, stamping
 * `githubData.syncedAt`. A draft and its published document share one GitHub request.
 * Every patch also clears any pending `githubSyncRequestedAt`.
 */
export async function syncProjects(projects: SyncableProject[]): Promise<ProjectSyncResult[]> {
  const byRepo = new Map<string, Promise<GitHubData | null>>()
  const results: ProjectSyncResult[] = []

  for (const project of projects) {
    const title = project.title ?? project._id
    if (!project.github) {
      await writeClient.patch(project._id).unset(["githubSyncRequestedAt"]).commit()
      results.push({ id: project._id, title, ok: false, message: "No GitHub URL" })
      continue
    }
    if (!byRepo.has(project.github)) byRepo.set(project.github, fetchGitHubData(project.github))
    const data = await byRepo.get(project.github)!

    const patch = writeClient.patch(project._id).unset(["githubSyncRequestedAt"])
    if (!data) {
      await patch.commit().catch(() => undefined)
      results.push({ id: project._id, title, ok: false, message: "No data from GitHub" })
      continue
    }
    try {
      await patch
        .setIfMissing({ githubData: {} })
        .set({ ...githubPatchFields(data), "githubData.syncedAt": new Date().toISOString() })
        .commit()
      results.push({
        id: project._id,
        title,
        ok: true,
        message: data.activity ? "Updated" : "Updated (commit stats pending)",
      })
    } catch (error) {
      results.push({ id: project._id, title, ok: false, message: String(error) })
    }
  }
  return results
}
