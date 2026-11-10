import { siteConfig } from "./site"

/** One "Label  value" line of the signed identity statement. */
export interface IdentityLine {
  label: string
  value: string
}

/** The places that are Ashik's, in the order the statement lists them. */
export function identityLines(): IdentityLine[] {
  return [
    { label: "Site", value: siteConfig.url },
    { label: "GitHub", value: siteConfig.socials.github },
    { label: "LinkedIn", value: siteConfig.socials.linkedin },
    { label: "X", value: siteConfig.socials.twitter },
    { label: "Source", value: siteConfig.repo },
  ]
}

const LABEL_WIDTH = 10

/**
 * The exact text the footer's PGP signature covers. Changing anything here (or the name,
 * tagline or links it reads from siteConfig) needs a re-sign: `npx sanity exec
 * scripts/sign-identity.ts`. The unit tests fail until the signed copy matches.
 */
export function identityText(): string {
  return [
    siteConfig.name,
    siteConfig.tagline,
    "",
    ...identityLines().map((line) => `${line.label.padEnd(LABEL_WIDTH)}${line.value}`),
  ].join("\n")
}
