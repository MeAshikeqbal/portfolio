/**
 * One-off (2026-11-09): curate the home page and run a first GitHub sync from your own machine,
 * while the production cron is still missing its env vars.
 *
 * - features the chosen posts (home page writing),
 * - sets project statuses (from each repo's last push, confirmed by the owner),
 * - syncs GitHub stats onto every project with a public repo, stamping `githubData.syncedAt`.
 *
 *   npx sanity exec scripts/home-content.ts --with-user-token              # dry run
 *   npx sanity exec scripts/home-content.ts --with-user-token -- --execute
 *   npx sanity exec scripts/home-content.ts --with-user-token -- --execute --sync-only
 *
 * The shared fetcher in lib/fetch-github-data.ts is server-only, so this mirrors it with plain
 * fetch and writes the same fields. Public repos need no GitHub token.
 */
import { getCliClient } from "sanity/cli"

interface GitHubData {
  stars: number
  license: string
  language: string | null
  topics: string[]
  pushedAt: string | null
  activity: { commits: number; weeklyCommits: number[] } | null
}

async function github<T>(path: string): Promise<{ status: number; data: T | null }> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { accept: "application/vnd.github+json", "user-agent": "itsashik-dev-sync" },
  })
  return { status: res.status, data: res.status === 200 ? ((await res.json()) as T) : null }
}

/** Same result as fetchGitHubData(); retries while GitHub computes commit stats (HTTP 202). */
async function fetchGitHubData(repoUrl: string): Promise<GitHubData | null> {
  const [owner, repo] = new URL(repoUrl).pathname.split("/").filter(Boolean)
  if (!owner || !repo) return null
  const name = repo.replace(/\.git$/, "")
  const info = await github<{
    stargazers_count: number
    license: { name: string } | null
    language: string | null
    topics?: string[]
    pushed_at: string | null
  }>(`/repos/${owner}/${name}`)
  if (!info.data) return null

  let weeks: { total: number }[] | null = null
  for (let attempt = 0; attempt < 5 && !weeks; attempt++) {
    const stats = await github<{ total: number }[]>(`/repos/${owner}/${name}/stats/commit_activity`)
    if (Array.isArray(stats.data) && stats.data.length > 0) weeks = stats.data
    else if (stats.status === 202) await new Promise((r) => setTimeout(r, 2000))
    else break
  }

  return {
    stars: info.data.stargazers_count,
    license: info.data.license?.name || "Not specified",
    language: info.data.language ?? null,
    topics: info.data.topics ?? [],
    pushedAt: info.data.pushed_at ?? null,
    activity: weeks
      ? {
          commits: weeks.reduce((sum, week) => sum + (week.total || 0), 0),
          weeklyCommits: weeks.slice(-12).map((week) => week.total || 0),
        }
      : null,
  }
}

/** Same fields as githubPatchFields(): activity only when GitHub returned it. */
function githubPatchFields(data: GitHubData): Record<string, unknown> {
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

const execute = process.argv.includes("--execute")
/** Only the GitHub sync, e.g. to re-run it after a rate limit. */
const syncOnly = process.argv.includes("--sync-only")
const client = getCliClient({ apiVersion: "2026-11-01" })

/** Post titles to feature, matched exactly. */
const FEATURED_POSTS = ["Trial, Error, and Ethernet: My Homelab Learning Journey"]

/** Project status by repository name (the last path segment of `github`). */
const STATUSES: Record<string, "active" | "maintained" | "archived"> = {
  portfolio: "active",
  "get-a-date": "maintained",
  jhs: "maintained",
  "mc-status-page": "maintained",
  menu: "maintained",
  arogify: "maintained",
  bluebox: "archived",
}

const published = `!(_id in path("drafts.**"))`

async function main() {
  console.log(execute ? "EXECUTING" : "DRY RUN (pass -- --execute to write)")
  const tx = client.transaction()

  const posts = await client.fetch<{ _id: string; title: string; featured: boolean | null }[]>(
    `*[_type == "post" && ${published} && title in $titles]{ _id, title, featured }`,
    { titles: FEATURED_POSTS },
  )
  for (const title of syncOnly ? [] : FEATURED_POSTS) {
    const post = posts.find((p) => p.title === title)
    if (!post) throw new Error(`Post not found: ${title}`)
    console.log(`post     ${post.title}: featured ${post.featured ?? "unset"} -> true`)
    tx.patch(post._id, (p) => p.set({ featured: true }))
  }

  const projects = await client.fetch<
    { _id: string; title: string; status: string | null; github: string | null }[]
  >(`*[_type == "project" && ${published}]{ _id, title, status, github }`)
  for (const project of syncOnly ? [] : projects) {
    const repo = project.github?.replace(/\/+$/, "").split("/").pop()?.toLowerCase()
    const status = repo ? STATUSES[repo] : undefined
    if (!status) {
      console.log(
        `project  ${project.title}: no status mapping, left as ${project.status ?? "unset"}`,
      )
      continue
    }
    console.log(`project  ${project.title}: status ${project.status ?? "unset"} -> ${status}`)
    tx.patch(project._id, (p) => p.set({ status }))
  }

  const syncedAt = new Date().toISOString()
  for (const project of projects) {
    if (!project.github) continue
    const data = await fetchGitHubData(project.github)
    if (!data) {
      console.log(
        `sync     ${project.title}: no data from GitHub (private, renamed or rate-limited)`,
      )
      continue
    }
    const fields = githubPatchFields(data)
    console.log(
      `sync     ${project.title}: ${data.language ?? "?"}, ★${data.stars}, ${
        data.activity ? `${data.activity.commits} commits/yr` : "commit stats pending"
      }`,
    )
    tx.patch(project._id, (p) =>
      p.setIfMissing({ githubData: {} }).set({ ...fields, "githubData.syncedAt": syncedAt }),
    )
  }

  if (!execute) return
  const result = await tx.commit()
  console.log(`committed ${result.results.length} patches (transaction ${result.transactionId})`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
