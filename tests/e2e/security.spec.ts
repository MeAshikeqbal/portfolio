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
