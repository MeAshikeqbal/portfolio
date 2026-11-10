// @vitest-environment node
// openpgp needs Node's WebCrypto, which jsdom replaces.
import * as openpgp from "openpgp"
import { describe, expect, it } from "vitest"
import { identityText } from "@/lib/identity"
import { fingerprintGroups, keyValidity, parseClearsigned } from "@/lib/pgp"
import { pgpKey, signedIdentity } from "@/lib/pgp.generated"
import { siteConfig } from "@/lib/site"

const RESIGN = "Re-sign it: npx sanity exec scripts/sign-identity.ts"

describe("the signed identity statement", () => {
  it("covers exactly the current statement (name, tagline, links)", () => {
    expect(parseClearsigned(signedIdentity)?.body, RESIGN).toBe(identityText())
  })

  it("is signed by the key in siteConfig, and the signature verifies", async () => {
    const key = await openpgp.readKey({ armoredKey: pgpKey.publicKey })
    expect(key.getFingerprint().toUpperCase()).toBe(siteConfig.pgpFingerprint)
    expect(pgpKey.fingerprint).toBe(siteConfig.pgpFingerprint)

    const message = await openpgp.readCleartextMessage({ cleartextMessage: signedIdentity })
    const { signatures, data } = await openpgp.verify({ message, verificationKeys: key })
    expect(data).toBe(identityText())
    await expect(signatures[0].verified).resolves.toBe(true)
  })

  it("states the key's real expiry", async () => {
    const key = await openpgp.readKey({ armoredKey: pgpKey.publicKey })
    const expires = await key.getExpirationTime()
    expect(pgpKey.expiresAt).toBe(expires instanceof Date ? expires.toISOString() : null)
  })
})

describe("parseClearsigned", () => {
  const armored = [
    "-----BEGIN PGP SIGNED MESSAGE-----",
    "Hash: SHA512",
    "",
    "hello",
    "- -- dash-escaped",
    "-----BEGIN PGP SIGNATURE-----",
    "",
    "iHUEARYKAB0WIQQ",
    "=abcd",
    "-----END PGP SIGNATURE-----",
  ].join("\n")

  it("splits headers, body and signature, undoing dash-escaping", () => {
    expect(parseClearsigned(armored)).toEqual({
      headers: ["Hash: SHA512"],
      body: "hello\n-- dash-escaped",
      signature: ["iHUEARYKAB0WIQQ", "=abcd"],
    })
  })

  it("returns null for anything that isn't a clearsigned message", () => {
    expect(parseClearsigned("hello")).toBeNull()
    expect(parseClearsigned(pgpKey.publicKey)).toBeNull()
  })
})

describe("fingerprintGroups", () => {
  it("groups a fingerprint in fours, upper-cased", () => {
    expect(fingerprintGroups("0102bde6dee8c792e691")).toEqual([
      "0102",
      "BDE6",
      "DEE8",
      "C792",
      "E691",
    ])
  })
})

describe("keyValidity", () => {
  const now = new Date("2026-11-10T00:00:00Z")
  const inDays = (days: number) => new Date(now.getTime() + days * 86_400_000).toISOString()

  it("is green while the key has more than 60 days left", () => {
    expect(keyValidity("2028-11-09T10:56:42Z", now)).toEqual({
      status: "up",
      label: "valid until Nov 9, 2028",
    })
  })

  it("turns amber in the last 60 days", () => {
    expect(keyValidity(inDays(23.5), now)).toEqual({ status: "warn", label: "expires in 23d" })
    expect(keyValidity(inDays(0.5), now)).toEqual({ status: "warn", label: "expires today" })
  })

  it("is red once expired", () => {
    expect(keyValidity("2026-11-01T00:00:00Z", now)).toEqual({
      status: "down",
      label: "expired Nov 1, 2026",
    })
  })

  it("handles a key without an expiry", () => {
    expect(keyValidity(null, now).status).toBe("up")
  })
})
