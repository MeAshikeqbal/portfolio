import "server-only"

import { Octokit } from "@octokit/rest"

const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN,
})

export interface GitHubData {
  stars: number
  license: string
  language: string | null
  topics: string[]
  pushedAt: string | null
  /**
   * Commit activity for the past year, or null while GitHub is still computing it (HTTP 202).
   * Callers should keep the previously stored values in that case rather than overwrite them.
   */
  activity: {
    /** Total commits over the past 52 weeks. */
    commits: number
    /** Commits per week for the last 12 weeks, oldest first. */
    weeklyCommits: number[]
  } | null
}

/** Parses `https://github.com/owner/repo(.git)(/...)` into its parts, or null if it isn't a GitHub repo URL. */
export function parseRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
  try {
    const url = new URL(repoUrl)
    if (url.hostname !== "github.com" && url.hostname !== "www.github.com") return null
    const [owner, repo] = url.pathname.split("/").filter(Boolean)
    if (!owner || !repo) return null
    return { owner, repo: repo.replace(/\.git$/, "") }
  } catch {
    return null
  }
}

/** Canonical form for comparing repo URLs (case-insensitive, no trailing slash or `.git`). */
export function normalizeRepoUrl(repoUrl: string): string {
  const parsed = parseRepoUrl(repoUrl)
  return parsed
    ? `https://github.com/${parsed.owner}/${parsed.repo}`.toLowerCase()
    : repoUrl.toLowerCase()
}

/**
 * Sanity `set` patch for a project's `githubData`, field by field. Commit activity is only
 * included when GitHub returned it, so a "still computing" response keeps the last stored
 * commits and weekly series instead of erasing them.
 */
export function githubPatchFields(data: GitHubData): Record<string, unknown> {
  const { activity, ...repoFields } = data
  const fields: Record<string, unknown> = Object.fromEntries(
    Object.entries(repoFields).map(([key, value]) => [`githubData.${key}`, value]),
  )
  if (activity) {
    fields["githubData.commits"] = activity.commits
    fields["githubData.weeklyCommits"] = activity.weeklyCommits
  }
  return fields
}

export async function fetchGitHubData(repoUrl: string): Promise<GitHubData | null> {
  const parsed = parseRepoUrl(repoUrl)
  if (!parsed) {
    console.warn(`Not a GitHub repository URL: ${repoUrl}`)
    return null
  }
  const { owner, repo } = parsed

  try {
    const [repoData, commitsData] = await Promise.all([
      octokit.rest.repos.get({ owner, repo }),
      octokit.rest.repos.getCommitActivityStats({ owner, repo }).catch(() => null),
    ])

    // Commit activity covers the past year. GitHub answers 202 with no data while it computes
    // the stats; report that as "unknown" so the stored series isn't wiped. (No all-time
    // fallback: mixing all-time and past-year totals would make the numbers inconsistent.)
    const activity =
      commitsData && Array.isArray(commitsData.data) && commitsData.data.length > 0
        ? {
            commits: commitsData.data.reduce((sum, week) => sum + (week.total || 0), 0),
            weeklyCommits: commitsData.data.slice(-12).map((week) => week.total || 0),
          }
        : null

    return {
      stars: repoData.data.stargazers_count,
      license: repoData.data.license?.name || "Not specified",
      language: repoData.data.language ?? null,
      topics: repoData.data.topics ?? [],
      pushedAt: repoData.data.pushed_at ?? null,
      activity,
    }
  } catch (error) {
    console.error(`Error fetching GitHub data for ${owner}/${repo}:`, error)
    return null
  }
}

/** Public, non-fork, non-archived repositories owned by the token's user. */
export async function fetchOwnedPublicRepositories() {
  try {
    const repos = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
      visibility: "public",
      affiliation: "owner",
      sort: "updated",
      per_page: 100,
    })

    return repos
      .filter((repo) => !repo.fork && !repo.archived)
      .map((repo) => ({
        name: repo.name,
        description: repo.description,
        url: repo.html_url,
        homepage: repo.homepage,
        stars: repo.stargazers_count,
        language: repo.language,
        topics: repo.topics ?? [],
        pushedAt: repo.pushed_at,
      }))
  } catch (error) {
    console.error("Error fetching repositories:", error)
    return []
  }
}
