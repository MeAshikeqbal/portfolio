#!/usr/bin/env node
/**
 * Prints whether /now is published, as `ABOUT_PAGES=published|unpublished`, so a build and the
 * tests that run against it agree on one state (/homecave always exists):
 *
 *   node scripts/about-state.mjs >> "$GITHUB_ENV"     # CI, before `next build`
 *   export $(node scripts/about-state.mjs)            # locally
 *
 * Loads .env* like `next build`, asks the Sanity API host directly (never the apicdn CDN,
 * which can lag a publish) with the published perspective, and retries transient failures.
 */
import nextEnv from "@next/env"

nextEnv.loadEnvConfig(process.cwd())

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "0oqq6f9z"
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production"

// /homecave always exists (it's the live lab dashboard); only /now depends on content.
const query = `{ "now": count(*[_type == "now" && _id == "now"][0].body) }`

const url = new URL(`https://${projectId}.api.sanity.io/v2026-11-01/data/query/${dataset}`)
url.searchParams.set("query", query)
url.searchParams.set("perspective", "published")

const ATTEMPTS = 4

const wait = (attempt) => new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt))

/** The query result. Retries network errors, 5xx and 429; other statuses fail at once. */
async function fetchResult() {
  let failure = "no attempt made"
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (attempt > 0) await wait(attempt - 1)
    let response
    try {
      response = await fetch(url, { headers: { "cache-control": "no-cache" } })
    } catch (error) {
      failure = `network error: ${error instanceof Error ? error.message : error}`
      continue
    }
    if (response.ok) return (await response.json()).result
    failure = `Sanity answered ${response.status}`
    if (response.status < 500 && response.status !== 429) break
  }
  throw new Error(failure)
}

try {
  const result = await fetchResult()
  const now = (result?.now ?? 0) > 0
  console.log(`ABOUT_PAGES=${now ? "published" : "unpublished"}`)
} catch (error) {
  console.error(`about-state: ${error instanceof Error ? error.message : error}`)
  process.exit(1)
}
