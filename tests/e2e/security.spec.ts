import { expect, test } from "@playwright/test"

test.describe("security headers", () => {
  test("pages send the security headers and a CSP", async ({ request }) => {
    const response = await request.get("/")
    const headers = response.headers()
    expect(headers["content-security-policy"]).toContain("default-src 'self'")
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'self'")
    expect(headers["strict-transport-security"]).toContain("max-age=")
    expect(headers["x-content-type-options"]).toBe("nosniff")
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin")
    expect(headers["x-powered-by"]).toBeUndefined()
  })

  test("the Sanity Studio is exempt from the site CSP", async ({ request }) => {
    const response = await request.get("/studio")
    expect(response.headers()["content-security-policy"]).toBeUndefined()
    expect(response.headers()["x-content-type-options"]).toBe("nosniff")
  })

  test("no page triggers a CSP violation", async ({ page }) => {
    // Record violations reported by the browser on every page we visit.
    await page.addInitScript(() => {
      ;(window as unknown as { __csp: string[] }).__csp = []
      document.addEventListener("securitypolicyviolation", (event) => {
        ;(window as unknown as { __csp: string[] }).__csp.push(
          `${event.violatedDirective} ← ${event.blockedURI || "inline"}`,
        )
      })
    })

    const violations: string[] = []
    for (const path of [
      "/",
      "/post",
      "/post/a-beginner-s-guide-to-building-a-website-using-a-modern-javascript-framework",
      "/projects",
      "/projects/portfolio",
      "/no-such-page",
    ]) {
      await page.goto(path, { waitUntil: "load" })
      await page.waitForTimeout(1500)
      if (path === "/") {
        // Exercise the interactive bits too: the palette and the contact form's Turnstile.
        await page.keyboard.press("Control+k")
        await page.keyboard.press("Escape")
        await page.locator("#contact").scrollIntoViewIfNeeded()
        await page.waitForTimeout(1500)
      }
      const found = await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)
      violations.push(...found.map((v) => `${path}: ${v}`))
    }
    expect(violations).toEqual([])
  })
})

test.describe("keys and signatures", () => {
  const slug = "a-beginner-s-guide-to-building-a-website-using-a-modern-javascript-framework"

  test("security.txt is clearsigned, at the RFC 9116 path and the old one", async ({ request }) => {
    const response = await request.get("/.well-known/security.txt")
    // 404 until the first `npm run sign`; never an unsigned file.
    test.skip(response.status() === 404, "security.txt isn't signed yet")
    expect(response.status()).toBe(200)
    const text = await response.text()
    expect(text).toMatch(/^-----BEGIN PGP SIGNED MESSAGE-----/)
    expect(text).toContain("Expires: ")
    const old = await request.get("/security.txt", { maxRedirects: 0 })
    expect(old.headers().location).toContain("/.well-known/security.txt")
  })

  test("WKD serves the key for hello@ in both layouts, and nothing else", async ({ request }) => {
    for (const path of [
      "/.well-known/openpgpkey/hu/im4cc8qhazwkfsi65a8us1bc5gzk1o4p",
      "/.well-known/openpgpkey/itsashik.dev/hu/im4cc8qhazwkfsi65a8us1bc5gzk1o4p",
    ]) {
      const response = await request.get(path)
      expect(response.status(), path).toBe(200)
      expect(response.headers()["content-type"]).toBe("application/octet-stream")
      expect(response.headers()["access-control-allow-origin"]).toBe("*")
    }
    expect((await request.get("/.well-known/openpgpkey/itsashik.dev/policy")).status()).toBe(200)
    expect((await request.get("/.well-known/openpgpkey/hu/nobody")).status()).toBe(404)
  })

  test("a post's Markdown copy is served beside it, outside the index", async ({ request }) => {
    const response = await request.get(`/post/${slug}.md`)
    expect(response.status()).toBe(200)
    expect(response.headers()["content-type"]).toBe("text/markdown; charset=utf-8")
    expect(response.headers()["x-robots-tag"]).toBe("noindex")
    expect(await response.text()).toContain(`canonical: https://www.itsashik.dev/post/${slug}`)
    expect((await request.get("/post/no-such-post.md")).status()).toBe(404)
  })
})

test.describe("the bare domain", () => {
  const apex = (path: string, agent: string) => ({
    path,
    options: { headers: { host: "itsashik.dev", "user-agent": agent }, maxRedirects: 0 },
  })
  const browser = "Mozilla/5.0 (X11; Linux x86_64) Chrome/130"

  test("sends browsers to www, path and query intact", async ({ request }) => {
    const { path, options } = apex("/post?category=Homelab", browser)
    const response = await request.get(path, options)
    expect(response.status()).toBe(308)
    expect(response.headers().location).toBe("https://www.itsashik.dev/post?category=Homelab")
  })

  test("answers command-line clients itself", async ({ request }) => {
    for (const path of ["/", "/pgp.asc", "/resume"]) {
      const { options } = apex(path, "curl/8.9.1")
      expect((await request.get(path, options)).status(), path).toBe(200)
    }
  })

  test("serves the WKD key directory, but sends security.txt to its canonical www copy", async ({
    request,
  }) => {
    const wkd = apex("/.well-known/openpgpkey/hu/im4cc8qhazwkfsi65a8us1bc5gzk1o4p", browser)
    expect((await request.get(wkd.path, wkd.options)).status()).toBe(200)
    const sec = apex("/.well-known/security.txt", "curl/8.9.1")
    const response = await request.get(sec.path, sec.options)
    expect(response.status()).toBe(308)
    expect(response.headers().location).toBe("https://www.itsashik.dev/.well-known/security.txt")
  })
})
