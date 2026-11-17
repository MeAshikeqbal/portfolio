import { createHash } from "node:crypto"

/**
 * OpenPGP Web Key Directory (draft-koch-openpgp-webkey-service): lets `gpg --locate-keys
 * hello@itsashik.dev` and mail clients find the site's key from the address alone.
 *
 * The key is served at /.well-known/openpgpkey/[<domain>/]hu/<hash>, where the hash is the
 * z-base-32 SHA-1 of the address's lower-cased local part. The "advanced" layout (with the
 * domain) is what clients try first, on the openpgpkey.<domain> host; the "direct" layout is the
 * fallback on the domain itself.
 */

const ZBASE32 = "ybndrfg8ejkmcpqxot1uwisza345h769"

/** z-base-32 (RFC 6189 §5.1.6), as WKD uses it. */
export function zbase32(bytes: Uint8Array): string {
  let out = ""
  let buffer = 0
  let bits = 0
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += ZBASE32[(buffer >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += ZBASE32[(buffer << (5 - bits)) & 31]
  return out
}

/** The WKD hash of an address's local part: "hello" → the 32-character name of the key file. */
export function wkdHash(localPart: string): string {
  return zbase32(createHash("sha1").update(localPart.toLowerCase(), "utf8").digest())
}

/** An ASCII-armored key as the binary OpenPGP packets WKD serves. */
export function dearmor(armored: string): Uint8Array {
  const lines = armored.replace(/\r\n/g, "\n").trim().split("\n")
  const begin = lines.findIndex((line) => line.startsWith("-----BEGIN PGP"))
  const end = lines.findIndex((line) => line.startsWith("-----END PGP"))
  if (begin < 0 || end < begin) throw new Error("Not an armored OpenPGP block")
  // Armor headers ("Comment: …") end at the first blank line; the "=" line is the checksum.
  const body = lines.slice(begin + 1, end)
  const blank = body.indexOf("")
  const data = (blank >= 0 ? body.slice(blank + 1) : body).filter((line) => !line.startsWith("="))
  return new Uint8Array(Buffer.from(data.join(""), "base64"))
}

/** The response for a WKD key request: the key for `email`'s hash, else 404. */
export function wkdKeyResponse(
  key: { email: string; publicKey: string },
  request: { hash: string; domain?: string },
): Response {
  const [localPart, domain] = key.email.split("@")
  const domainMatches = request.domain === undefined || request.domain.toLowerCase() === domain
  if (!domainMatches || request.hash !== wkdHash(localPart)) {
    return new Response(null, { status: 404, headers: CORS })
  }
  return new Response(Buffer.from(dearmor(key.publicKey)), {
    headers: { ...CORS, "content-type": "application/octet-stream" },
  })
}

/** The policy file's presence is what tells clients the domain runs a WKD; it can be empty. */
export function wkdPolicyResponse(request: { domain?: string }, email: string): Response {
  const domain = email.split("@")[1]
  if (request.domain !== undefined && request.domain.toLowerCase() !== domain) {
    return new Response(null, { status: 404, headers: CORS })
  }
  return new Response("", { headers: { ...CORS, "content-type": "text/plain; charset=utf-8" } })
}

// The draft asks for this, so web-based clients can fetch the key too.
const CORS = { "access-control-allow-origin": "*" }
