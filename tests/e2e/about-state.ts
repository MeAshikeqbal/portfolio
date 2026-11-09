import { siteConfig } from "../../lib/site"

/**
 * Whether /uses and /now are published, as decided by `scripts/about-state.mjs` before the
 * build (`export $(node scripts/about-state.mjs)`). The build and these tests must agree, so
 * the state is never guessed at test time. Validated here, so any run that imports this
 * (including a filtered one) fails loudly instead of skipping everything.
 */
function readState(): "published" | "unpublished" {
  const value = process.env.ABOUT_PAGES
  if (value === "published" || value === "unpublished") return value
  throw new Error(
    `ABOUT_PAGES must be "published" or "unpublished" (got ${JSON.stringify(value)}). ` +
      "Run `export $(node scripts/about-state.mjs)` before building and testing.",
  )
}

export const ABOUT_PAGES = readState()

export const ABOUT_PATHS = ["/uses", "/now"] as const

/** The exact sitemap entry for a path, so e.g. a post slug "now-playing" never matches "/now". */
export function sitemapLoc(path: string): string {
  return `<loc>${new URL(path, siteConfig.url).toString()}</loc>`
}
