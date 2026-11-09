#!/usr/bin/env node
/**
 * Prints whether /uses and /now are published, as `ABOUT_PAGES=published|unpublished`, so a
 * build and the tests that run against it agree on one state:
 *
 *   node scripts/about-state.mjs >> "$GITHUB_ENV"     # CI, before `next build`
 *   export $(node scripts/about-state.mjs)            # locally
 *
 * - Loads .env* the way `next build` does, so it asks the same project and dataset.
 * - Asks the Sanity API host directly (never the apicdn CDN, which can lag a publish) with
 *   the published perspective, retrying transient failures a few times.
 * - Applies the pages' own notFound() rules in JS: /uses needs a section with an item whose
 *   name isn't blank once trimmed (GROQ can't trim), /now a non-empty body.
 * - Exits non-zero if only one page is published: neither test suite fits that state.
 */
import nextEnv from "@next/env"

nextEnv.loadEnvConfig(process.cwd())

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "0oqq6f9z"
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production"

const query = `{
  "uses": *[_type == "uses" && _id == "uses"][0].sections[]{ "names": items[].name },
  "now": count(*[_type == "now" && _id == "now"][0].body)
}`

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
  const uses = (result?.uses ?? []).some((section) =>
    (section?.names ?? []).some((name) => typeof name === "string" && name.trim() !== ""),
  )
  const now = (result?.now ?? 0) > 0
  if (uses !== now) {
    console.error(
      `about-state: only one page is published (uses: ${uses}, now: ${now}); ` +
        "publish both with scripts/about-content.ts",
    )
    process.exit(1)
  }
  console.log(`ABOUT_PAGES=${uses ? "published" : "unpublished"}`)
} catch (error) {
  console.error(`about-state: ${error instanceof Error ? error.message : error}`)
  process.exit(1)
}
