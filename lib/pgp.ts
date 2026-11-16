import type { Status } from "./status"

/** The pieces of a clearsigned message, as they appear between its armor lines. */
export interface Clearsigned {
  /** Armor headers such as "Hash: SHA512". */
  headers: string[]
  /** The signed text, with dash-escaping undone. */
  body: string
  /** The base64 lines inside the signature armor (including the "=" checksum line). */
  signature: string[]
}

const BEGIN_MESSAGE = "-----BEGIN PGP SIGNED MESSAGE-----"
const BEGIN_SIGNATURE = "-----BEGIN PGP SIGNATURE-----"
const END_SIGNATURE = "-----END PGP SIGNATURE-----"

/** Splits an armored clearsigned message (RFC 9580 §7). Returns null when it isn't one. */
export function parseClearsigned(armored: string): Clearsigned | null {
  const lines = armored.replace(/\r\n/g, "\n").trim().split("\n")
  const start = lines.indexOf(BEGIN_MESSAGE)
  const sigStart = lines.indexOf(BEGIN_SIGNATURE)
  const sigEnd = lines.indexOf(END_SIGNATURE)
  if (start !== 0 || sigStart < 0 || sigEnd < sigStart) return null

  const blank = lines.indexOf("", start)
  if (blank < 0 || blank > sigStart) return null

  const signature = lines.slice(sigStart + 1, sigEnd)
  // The armor may carry its own headers ("Comment: …") before a blank line.
  const sigBlank = signature.indexOf("")

  return {
    headers: lines.slice(start + 1, blank),
    body: lines
      .slice(blank + 1, sigStart)
      .map((line) => (line.startsWith("- ") ? line.slice(2) : line))
      .join("\n"),
    signature: sigBlank >= 0 ? signature.slice(sigBlank + 1) : signature,
  }
}

/** "0102BDE6…3762" → ["0102", "BDE6", …], the way gpg prints fingerprints. */
export function fingerprintGroups(fingerprint: string): string[] {
  return fingerprint.toUpperCase().match(/.{1,4}/g) ?? []
}

/** A key this close to expiry reads amber, so there's time to extend it. */
export const KEY_WARN_DAYS = 60

/**
 * Whether the key is still good, judged against `now` (pages are static, so the browser
 * re-judges it). Valid is green, the last KEY_WARN_DAYS are amber, expired is red.
 */
export function keyValidity(expiresAt: string | null, now: Date = new Date()): KeyValidityVerdict {
  if (!expiresAt) return { status: "up", code: "keyNoExpiry" }
  const expires = new Date(expiresAt)
  const days = Math.floor((expires.getTime() - now.getTime()) / 86_400_000)
  if (days < 0) return { status: "down", code: "keyExpired", date: expiresAt }
  if (days < KEY_WARN_DAYS) {
    return days === 0
      ? { status: "warn", code: "keyExpiresToday" }
      : { status: "warn", code: "keyExpiresIn", days }
  }
  return { status: "up", code: "keyValidUntil", date: expiresAt }
}

/** keyValidity's verdict; `code` is a key in the `footer` messages, filled from `days`/`date`. */
export interface KeyValidityVerdict {
  status: Status
  code: "keyNoExpiry" | "keyExpired" | "keyExpiresToday" | "keyExpiresIn" | "keyValidUntil"
  days?: number
  /** ISO date, formatted for the page's locale by the caller. */
  date?: string
}
