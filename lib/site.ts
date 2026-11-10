/**
 * Single source of truth for site-wide constants (URLs, identity, socials).
 * Import from here instead of hardcoding values in pages, feeds or metadata.
 */
const socials = {
  github: "https://github.com/MeAshikEqbal",
  linkedin: "https://linkedin.com/in/itsashik",
  twitter: "https://x.com/me_ashikeqbal",
} as const

export const siteConfig = {
  url: "https://www.itsashik.dev",
  name: "Ashik Eqbal",
  title: "Ashik Eqbal - Software Engineer",
  description:
    "Writing and projects from Ashik Eqbal, a full-stack engineer who builds for the web, runs a homelab, and writes up what breaks.",
  locale: "en_US",
  twitterHandle: "@me_ashikeqbal",
  role: "Software engineer",
  tagline: "Building for the web, running my own infrastructure, and writing up what breaks.",
  /**
   * Hero availability badge. `status`: "up" (green, pulsing) = available, "warn" (amber) =
   * limited, "idle" (grey) = not looking. Set to `null` to hide the badge entirely.
   */
  availability: null as {
    status: "up" | "warn" | "idle"
    label: string
  } | null,
  repo: "https://github.com/MeAshikeqbal/portfolio",
  /**
   * The PGP key that signs the footer's identity statement. The trust anchor: tests fail unless
   * lib/pgp.generated.ts carries this key and a signature from it (scripts/sign-identity.ts).
   */
  pgpFingerprint: "0102BDE6DEE8C792E6917D05FA0D3AE3EB0E3762",
  /** /now shows an amber "stale" pill once its last edit is older than this. */
  nowStaleAfterDays: 90,
  socials,
  /** Social profiles, in display order (hero, contact, footer). */
  socialLinks: [
    { id: "github", label: "GitHub", href: socials.github },
    { id: "linkedin", label: "LinkedIn", href: socials.linkedin },
    { id: "twitter", label: "X (Twitter)", href: socials.twitter },
  ],
  /** Primary navigation. Hash links point at home-page sections and work from any page. */
  nav: [
    { label: "Writing", href: "/post" },
    { label: "Projects", href: "/projects" },
    { label: "Homecave", href: "/homecave" },
    { label: "Contact", href: "/#contact" },
  ],
} as const

/** Builds an absolute URL on the canonical domain from a path like `/post/foo`. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, siteConfig.url).toString()
}
