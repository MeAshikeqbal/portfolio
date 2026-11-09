/**
 * Whether /uses and /now are published, as decided by `scripts/about-state.mjs` before the
 * build (`export $(node scripts/about-state.mjs)`). The build and these tests must agree, so
 * the state is never guessed at test time.
 */
export const ABOUT_PAGES = process.env.ABOUT_PAGES as "published" | "unpublished" | undefined

export const ABOUT_PATHS = ["/uses", "/now"] as const
