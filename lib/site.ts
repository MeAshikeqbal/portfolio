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
  role: "Software engineer",
  tagline: "A passionate software engineer who loves to build web applications.",
  /**
   * Hero availability badge, e.g. `{ status: "up", label: "open to work" }`.
   * `null` hides it: the site never claims availability unless it's set here.
   */
  availability: null as { status: "up" | "warn" | "idle"; label: string } | null,
  repo: "https://github.com/MeAshikeqbal/portfolio",
  socials: {
    github: "https://github.com/MeAshikEqbal",
    linkedin: "https://linkedin.com/in/itsashik",
    twitter: "https://x.com/me_ashikeqbal",
  },
  /** Primary navigation. Hash links point at home-page sections and work from any page. */
  nav: [
    { label: "Work", href: "/#services" },
    { label: "Writing", href: "/post" },
    { label: "Projects", href: "/projects" },
    { label: "Contact", href: "/#contact" },
  ],
} as const

/** Builds an absolute URL on the canonical domain from a path like `/post/foo`. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, siteConfig.url).toString()
}
