import "server-only"

import { Octokit } from "@octokit/rest"

const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN,
})

export interface GitHubData {
  stars: number
  commits: number
  license: string
  language: string | null
  topics: string[]
  pushedAt: string | null
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

    // Commit activity covers the last year; GitHub returns 202 (empty) while it computes stats.
    let totalCommits = 0
    if (commitsData && Array.isArray(commitsData.data)) {
      totalCommits = commitsData.data.reduce((sum, week) => sum + (week.total || 0), 0)
    } else {
      const { data: contributors } = await octokit.rest.repos.getContributorsStats({ owner, repo })
      if (Array.isArray(contributors)) {
        totalCommits = contributors.reduce((sum, contributor) => sum + contributor.total, 0)
      }
    }

    return {
      stars: repoData.data.stargazers_count,
      commits: totalCommits,
      license: repoData.data.license?.name || "Not specified",
      language: repoData.data.language ?? null,
      topics: repoData.data.topics ?? [],
      pushedAt: repoData.data.pushed_at ?? null,
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
