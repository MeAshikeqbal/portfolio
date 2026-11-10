import { expect, test } from "@playwright/test"
import { ABOUT_PAGES, ABOUT_PATHS, sitemapLoc } from "./about-state"

test.describe("/now once published", () => {
  test.skip(ABOUT_PAGES !== "published", "ABOUT_PAGES isn't 'published'")

  test("renders with a date and is linked from the footer", async ({ page }) => {
    await page.goto("/now")
    await expect(page.getByRole("heading", { level: 1, name: "Now" })).toBeVisible()
    await expect(page.getByText(/^updated /)).toBeVisible()
    const footer = page.locator("footer")
    for (const path of ABOUT_PATHS) {
      await expect(footer.locator(`a[href="${path}"]`)).toHaveCount(1)
    }
  })

  test("is listed in the sitemap", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text()
    for (const path of ABOUT_PATHS) expect(sitemap).toContain(sitemapLoc(path))
  })

  test("is in the command menu", async ({ page }) => {
    await page.goto("/")
    await page.keyboard.press("Control+k")
    const dialog = page.getByRole("dialog", { name: "Search and commands" })
    await expect(dialog.getByRole("option", { name: "Now", exact: true })).toBeVisible()
  })
})
