import { expect, test } from "@playwright/test"
import { ABOUT_PAGES, ABOUT_PATHS, sitemapLoc } from "./about-state"

test.describe("/uses and /now once published", () => {
  test.skip(ABOUT_PAGES !== "published", "ABOUT_PAGES isn't 'published'")

  test("render with a date and are linked from the footer", async ({ page }) => {
    await page.goto("/uses")
    await expect(page.getByRole("heading", { level: 1, name: "Uses" })).toBeVisible()
    await expect(page.getByText(/last updated ·/)).toBeVisible()

    await page.goto("/now")
    await expect(page.getByRole("heading", { level: 1, name: "Now" })).toBeVisible()
    await expect(page.getByText(/^updated /)).toBeVisible()

    const footer = page.locator("footer")
    for (const path of ABOUT_PATHS) {
      await expect(footer.locator(`a[href="${path}"]`)).toHaveCount(1)
    }
  })

  test("are listed in the sitemap", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text()
    for (const path of ABOUT_PATHS) expect(sitemap).toContain(sitemapLoc(path))
  })

  test("feed the hero's homelab list", async ({ page, isMobile }) => {
    await page.goto("/")
    const hero = page.locator("#home")
    await expect(hero.getByRole("link", { name: "full setup" })).toHaveAttribute("href", "/uses")
    const list = hero.getByRole("list", { name: "Homelab", includeHidden: true })
    const count = await list.getByRole("listitem", { includeHidden: true }).count()
    expect(count).toBeGreaterThanOrEqual(1)
    expect(count).toBeLessThanOrEqual(5)
    // Phones get the header and link only, so Writing starts inside the first screen.
    if (isMobile) await expect(list).toBeHidden()
    else await expect(list).toBeVisible()
  })

  test("are in the command menu", async ({ page }) => {
    await page.goto("/")
    await page.keyboard.press("Control+k")
    const dialog = page.getByRole("dialog", { name: "Search and commands" })
    await expect(dialog.getByRole("option", { name: "Uses", exact: true })).toBeVisible()
    await expect(dialog.getByRole("option", { name: "Now", exact: true })).toBeVisible()
  })
})
