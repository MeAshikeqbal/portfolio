#!/usr/bin/env node
/**
 * Prints whether /uses and /now are published, as `ABOUT_PAGES=published|unpublished`, so a
 * build and the tests that run against it agree on one state:
 *
 *   node scripts/about-state.mjs >> "$GITHUB_ENV"     # CI, before `next build`
 *   export $(node scripts/about-state.mjs)            # locally
 *
 * Asks the Sanity API host directly (never the apicdn CDN, which can lag a publish) with the
 * published perspective, and applies the same rules as the pages' notFound() checks: /uses
 * needs a section with a named item, /now a non-empty body. Both must be published.
 */
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "0oqq6f9z"
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production"

const query = `{
  "uses": count(*[_type == "uses" && _id == "uses"][0].sections[count(items[defined(name) && name != ""]) > 0]) > 0,
  "now": count(*[_type == "now" && _id == "now"][0].body) > 0
}`

const url = new URL(`https://${projectId}.api.sanity.io/v2026-11-01/data/query/${dataset}`)
url.searchParams.set("query", query)
url.searchParams.set("perspective", "published")

const response = await fetch(url, { headers: { "cache-control": "no-cache" } })
if (!response.ok) {
  console.error(`about-state: Sanity answered ${response.status}`)
  process.exit(1)
}
const { result } = await response.json()
if (result?.uses !== result?.now) {
  console.error(
    `about-state: only one page is published (uses: ${result?.uses}, now: ${result?.now}); ` +
      "publish both with scripts/about-content.ts",
  )
  process.exit(1)
}
console.log(`ABOUT_PAGES=${result.uses ? "published" : "unpublished"}`)
