import { expect, test } from "@playwright/test"
import { ABOUT_PAGES, ABOUT_PATHS, sitemapLoc } from "./about-state"

test.describe("/uses and /now before they're published", () => {
  test.skip(ABOUT_PAGES !== "unpublished", "ABOUT_PAGES isn't 'unpublished'")

  test("404 and stay unlinked", async ({ page, request }) => {
    for (const path of ABOUT_PATHS) {
      expect((await request.get(path)).status()).toBe(404)
    }
    await page.goto("/")
    await expect(page.locator('a[href="/uses"], a[href="/now"]')).toHaveCount(0)
  })

  test("stay out of the sitemap", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text()
    for (const path of ABOUT_PATHS) expect(sitemap).not.toContain(sitemapLoc(path))
  })
})
