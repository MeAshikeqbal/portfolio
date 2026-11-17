// @vitest-environment node
// openpgp needs Node's WebCrypto, which jsdom replaces.
import * as openpgp from "openpgp"
import { describe, expect, it } from "vitest"
import { pgpKey } from "@/lib/pgp.generated"
import { dearmor, wkdHash, wkdKeyResponse, wkdPolicyResponse, zbase32 } from "@/lib/wkd"

describe("wkdHash", () => {
  it("matches gpg's hash for the site's address (gpg --with-wkd-hash)", () => {
    expect(wkdHash("hello")).toBe("im4cc8qhazwkfsi65a8us1bc5gzk1o4p")
    expect(wkdHash("Hello")).toBe(wkdHash("hello"))
  })

  it("matches the draft's example (Joe.Doe@Example.ORG)", () => {
    expect(wkdHash("Joe.Doe")).toBe("iy9q119eutrkn8s1mk4r39qejnbu3n5q")
  })

  it("z-base-32 encodes partial groups", () => {
    expect(zbase32(new Uint8Array([]))).toBe("")
    expect(zbase32(new Uint8Array([0xff]))).toBe("9h")
  })
})

describe("dearmor", () => {
  it("yields the same key as the armored copy", async () => {
    const binary = await openpgp.readKey({ binaryKey: dearmor(pgpKey.publicKey) })
    expect(binary.getFingerprint().toUpperCase()).toBe(pgpKey.fingerprint)
  })

  it("rejects text that isn't armored", () => {
    expect(() => dearmor("hello")).toThrow()
  })
})

describe("the WKD responses", () => {
  const key = { email: "hello@itsashik.dev", publicKey: pgpKey.publicKey }
  const hash = wkdHash("hello")

  it("serves the binary key for the address's hash, on either layout", async () => {
    for (const request of [
      { hash },
      { hash, domain: "itsashik.dev" },
      { hash, domain: "ITSASHIK.dev" },
    ]) {
      const response = wkdKeyResponse(key, request)
      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toBe("application/octet-stream")
      expect(response.headers.get("access-control-allow-origin")).toBe("*")
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(dearmor(pgpKey.publicKey))
    }
  })

  it("404s for other addresses and other domains", () => {
    expect(wkdKeyResponse(key, { hash: wkdHash("root") }).status).toBe(404)
    expect(wkdKeyResponse(key, { hash, domain: "example.org" }).status).toBe(404)
  })

  it("serves an empty policy for the key's domain only", async () => {
    const policy = wkdPolicyResponse({ domain: "itsashik.dev" }, key.email)
    expect(policy.status).toBe(200)
    expect(await policy.text()).toBe("")
    expect(wkdPolicyResponse({}, key.email).status).toBe(200)
    expect(wkdPolicyResponse({ domain: "example.org" }, key.email).status).toBe(404)
  })
})
