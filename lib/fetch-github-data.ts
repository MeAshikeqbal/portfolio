import "server-only"

import { Octokit } from "@octokit/rest"

const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN,
})

/** A repository README as stored on the project (the `readme` field). */
export interface ReadmeData {
  markdown: string
  /** Path in the repository, e.g. "README.md". */
  path: string
  /** The default branch it was read from. */
  ref: string
}

/** READMEs above this size are not stored (Sanity documents stay small; nobody reads 200 KB). */
export const README_MAX_BYTES = 200_000

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
  /**
   * The README: null when the repository has none (or it's too large), undefined when it
   * couldn't be fetched, in which case the stored copy is kept.
   */
  readme?: ReadmeData | null
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
  const { activity, stars, license, language, topics, pushedAt } = data
  const repoFields = { stars, license, language, topics, pushedAt }
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
    const [repoData, commitsData, readme] = await Promise.all([
      octokit.rest.repos.get({ owner, repo }),
      octokit.rest.repos.getCommitActivityStats({ owner, repo }).catch(() => null),
      fetchReadme(owner, repo),
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
      readme: readme && { ...readme, ref: repoData.data.default_branch },
    }
  } catch (error) {
    console.error(`Error fetching GitHub data for ${owner}/${repo}:`, error)
    return null
  }
}

/** The repository's README (default branch), null if there is none, undefined on error. */
async function fetchReadme(
  owner: string,
  repo: string,
): Promise<Omit<ReadmeData, "ref"> | null | undefined> {
  try {
    const { data } = await octokit.rest.repos.getReadme({ owner, repo })
    if (data.encoding !== "base64" || data.size > README_MAX_BYTES) return null
    return { markdown: Buffer.from(data.content, "base64").toString("utf8"), path: data.path }
  } catch (error) {
    if ((error as { status?: number }).status === 404) return null
    console.error(`Error fetching the README for ${owner}/${repo}:`, error)
    return undefined
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
