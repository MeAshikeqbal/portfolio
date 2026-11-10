import { expect, test } from "@playwright/test"
import { sitemapLoc } from "./about-state"

// Homecave always exists: it's the live homelab dashboard, with or without Studio copy or a
// heartbeat (CI has neither Upstash nor a lab, so it shows the "hasn't reported" state).
test.describe("Homecave", () => {
  test("renders, and is in the nav, footer and sitemap", async ({ page, request, isMobile }) => {
    await page.goto("/homecave")
    await expect(page.getByRole("heading", { level: 1, name: "Homecave" })).toBeVisible()
    // The privacy note sits right under the dashboard, whatever the lab's state.
    await expect(page.getByText(/the lab connects outward only/)).toBeVisible()
    // The desk setup (from the Studio) is collapsed until asked for.
    const desk = page.locator("details").filter({ hasText: "Desk & tools" })
    if (await desk.count()) {
      await expect(desk).not.toHaveAttribute("open")
      await desk.locator("summary").click()
      await expect(desk).toHaveAttribute("open")
    }
    if (!isMobile) {
      const link = page
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: "Homecave" })
      await expect(link).toHaveAttribute("href", "/homecave")
      await expect(link).toHaveAttribute("aria-current", "page")
    }
    await expect(page.locator('footer a[href="/homecave"]')).toHaveCount(1)
    const sitemap = await (await request.get("/sitemap.xml")).text()
    expect(sitemap).toContain(sitemapLoc("/homecave"))
  })

  test("/uses redirects there permanently", async ({ request }) => {
    const response = await request.get("/uses", { maxRedirects: 0 })
    expect(response.status()).toBe(308)
    expect(new URL(response.headers()["location"], "http://x").pathname).toBe("/homecave")
  })

  test("the hero's 'live dashboard' link and the command menu lead there", async ({ page }) => {
    await page.goto("/")
    const setup = page.locator("#home").getByRole("link", { name: "live dashboard" })
    if (await setup.count()) await expect(setup).toHaveAttribute("href", "/homecave")
    await page.keyboard.press("Control+k")
    const dialog = page.getByRole("dialog", { name: "Search and commands" })
    await expect(dialog.getByRole("option", { name: "Homecave", exact: true })).toBeVisible()
  })

  test("the lab status API answers, null without a lab", async ({ request }) => {
    const response = await request.get("/api/lab-status")
    expect(response.status()).toBe(200)
    expect(response.headers()["cache-control"]).toContain("s-maxage=30")
  })
})
