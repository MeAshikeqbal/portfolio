import { expect, test } from "@playwright/test"

/** Locale routing (proxy.ts): English stays unprefixed, files and APIs are never touched. */
test.describe("locale routing", () => {
  test("English pages keep their unprefixed URLs", async ({ page }) => {
    const response = await page.goto("/post")
    expect(response?.status()).toBe(200)
    expect(new URL(page.url()).pathname).toBe("/post")
    await expect(page.locator("html")).toHaveAttribute("lang", "en")
  })

  test("/en/... redirects to the unprefixed URL", async ({ request }) => {
    const response = await request.get("/en/post", { maxRedirects: 0 })
    expect([307, 308]).toContain(response.status())
    expect(new URL(response.headers().location, "http://x").pathname).toBe("/post")
  })

  test("English share images are served at their /en URL without a redirect", async ({
    request,
  }) => {
    const response = await request.get("/en/opengraph-image", { maxRedirects: 0 })
    expect(response.status()).toBe(200)
    expect(response.headers()["content-type"]).toBe("image/png")
  })

  for (const path of ["/rss.xml", "/sitemap.xml", "/robots.txt", "/pgp.asc", "/api/lab-status"]) {
    test(`${path} is outside the locale routing`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 })
      expect(response.status()).toBe(200)
    })
  }

  test("unknown paths 404, with or without a file extension", async ({ request }) => {
    expect((await request.get("/no-such-page")).status()).toBe(404)
    expect((await request.get("/no-such-file.php")).status()).toBe(404)
  })
})
