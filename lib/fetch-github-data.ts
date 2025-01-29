import { Octokit } from "@octokit/rest"

const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN,
})

export async function fetchGitHubData(repoUrl: string) {
  try {
    const [owner, repo] = repoUrl.replace("https://github.com/", "").split("/")

    const [repoData, commitsData] = await Promise.all([
      octokit.rest.repos.get({ owner, repo }),
      octokit.rest.repos.getCommitActivityStats({ owner, repo }),
    ])

    // Calculate total commits
    let totalCommits = 0
    if (Array.isArray(commitsData.data)) {
      totalCommits = commitsData.data.reduce((sum, week) => sum + (week.total || 0), 0)
    } else {
      console.warn(`Unexpected commit data format for ${owner}/${repo}`)
    }

    return {
      stars: repoData.data.stargazers_count,
      commits: totalCommits,
      license: repoData.data.license?.name || "Not specified",
    }
  } catch (error) {
    console.error("Error fetching GitHub data:", error)
    return null
  }
}

