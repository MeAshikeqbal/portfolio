import { siteConfig } from "./site"

/** RFC 9116 asks for less than a year; `npm run sign` renews it. */
export const SECURITY_TXT_DAYS = 364

/**
 * The fields of /.well-known/security.txt (RFC 9116), before signing. Relative imports only:
 * scripts/sign-identity.ts builds and signs it outside Next, and the unit tests rebuild it from
 * the signed copy's own Expires to check nothing else changed since.
 */
export function securityTxt({ email, expires }: { email: string; expires: string }): string {
  return [
    `Contact: mailto:${email}`,
    `Contact: ${siteConfig.url}/#contact`,
    `Expires: ${expires}`,
    `Encryption: openpgp4fpr:${siteConfig.pgpFingerprint.toLowerCase()}`,
    `Encryption: ${siteConfig.url}/pgp.asc`,
    "Preferred-Languages: en",
    `Canonical: ${siteConfig.url}/.well-known/security.txt`,
    "",
  ].join("\n")
}

/** Expires for a security.txt signed at `now`: SECURITY_TXT_DAYS later, at midnight UTC. */
export function securityTxtExpiry(now: Date): string {
  const expires = new Date(now.getTime() + SECURITY_TXT_DAYS * 86_400_000)
  return `${expires.toISOString().slice(0, 10)}T00:00:00.000Z`
}

/** The Expires value in a security.txt body, or null. */
export function parseExpires(text: string): string | null {
  return text.match(/^Expires: (.+)$/m)?.[1] ?? null
}
