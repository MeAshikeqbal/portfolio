/**
 * Single source of truth for site-wide constants (URLs, identity, socials).
 * Import from here instead of hardcoding values in pages, feeds or metadata.
 */
export const siteConfig = {
  url: "https://www.itsashik.dev",
  name: "Ashik Eqbal",
  title: "Ashik Eqbal - Software Engineer",
  description:
    "Personal portfolio and blog of Ashik Eqbal, a software engineer specializing in web development.",
  locale: "en_US",
  ogImage: "/og-image.jpg",
  twitterHandle: "@me_ashikeqbal",
  socials: {
    github: "https://github.com/MeAshikEqbal",
    linkedin: "https://linkedin.com/in/itsashik",
    twitter: "https://x.com/me_ashikeqbal",
  },
} as const

/** Builds an absolute URL on the canonical domain from a path like `/post/foo`. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, siteConfig.url).toString()
}
