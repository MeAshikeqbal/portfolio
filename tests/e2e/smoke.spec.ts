import { expect, test } from "@playwright/test"

test.describe("smoke", () => {
  test("home page renders its main sections", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/Ashik Eqbal/)
    await expect(page.locator("#Home")).toBeVisible()
    await expect(page.locator("#Tech-Stack")).toBeAttached()
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://www.itsashik.dev")
  })

  test("blog index links through to a post", async ({ page }) => {
    await page.goto("/post")
    const firstPost = page.locator('a[href^="/post/"]').first()
    await expect(firstPost).toBeVisible()
    const href = await firstPost.getAttribute("href")
    await page.goto(href!)
    await expect(page.locator("article h1").first()).toBeVisible()
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://www.itsashik.dev${href}`)
  })

  test("projects page lists projects", async ({ page }) => {
    await page.goto("/projects")
    await expect(page.getByRole("heading", { name: "All Projects" })).toBeVisible()
  })

  test("unknown routes return 404", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist")
    expect(response?.status()).toBe(404)
  })

  test("feeds are served", async ({ request }) => {
    const rss = await request.get("/rss.xml")
    expect(rss.ok()).toBe(true)
    expect(await rss.text()).toContain("<rss")

    const sitemap = await request.get("/sitemap.xml")
    expect(sitemap.ok()).toBe(true)
    expect(await sitemap.text()).toContain("https://www.itsashik.dev/post/")
  })
})
