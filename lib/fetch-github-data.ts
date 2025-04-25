import { Octokit } from "@octokit/rest"

const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN,
})

export async function fetchGitHubData(repoUrl: string) {
  try {
    const [owner, repo] = repoUrl.replace("https://github.com/", "").split("/")

    const [repoData, commitsData] = await Promise.all([
      octokit.rest.repos.get({ owner, repo }),
      octokit.rest.repos.getCommitActivityStats({ owner, repo }).catch(() => null),
    ])

    // Calculate total commits
    let totalCommits = 0
    if (commitsData && Array.isArray(commitsData.data)) {
      totalCommits = commitsData.data.reduce((sum, week) => sum + (week.total || 0), 0)
    } else {
      console.warn(`Unable to fetch commit data for ${owner}/${repo}. Using fallback method.`)
      // Fallback: fetch the total commit count
      const { data: commitCount } = await octokit.rest.repos.getContributorsStats({ owner, repo })
      if (Array.isArray(commitCount)) {
        totalCommits = commitCount.reduce((sum, contributor) => sum + contributor.total, 0)
      } else {
        console.warn(`Unexpected contributor stats format for ${owner}/${repo}`)
      }
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

export async function fetchAllRepositories() {
  try {
    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      visibility: "all",
      sort: "updated",
      per_page: 100, // Adjust this number based on how many repos you want to fetch
    })

    return repos.map((repo) => ({
      name: repo.name,
      description: repo.description,
      url: repo.html_url,
      homepage: repo.homepage,
      stars: repo.stargazers_count,
      language: repo.language,
      updatedAt: repo.updated_at,
    }))
  } catch (error) {
    console.error("Error fetching repositories:", error)
    return []
  }
}

