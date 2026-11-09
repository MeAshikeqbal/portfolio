import { expect, test } from "@playwright/test"

test.describe("smoke", () => {
  test("home page renders its main sections", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/Ashik Eqbal/)
    await expect(page.getByRole("heading", { level: 1, name: "Ashik Eqbal" })).toBeVisible()
    for (const id of ["services", "writing", "uptime", "inventory", "contact"]) {
      await expect(page.locator(`#${id}`)).toBeAttached()
    }
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://www.itsashik.dev",
    )
  })

  test("blog index links through to a post", async ({ page }) => {
    await page.goto("/post")
    const firstPost = page.locator('a[href^="/post/"]').first()
    await expect(firstPost).toBeVisible()
    const href = await firstPost.getAttribute("href")
    await page.goto(href!)
    await expect(page.locator("article h1").first()).toBeVisible()
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://www.itsashik.dev${href}`,
    )
  })

  test("projects page lists projects", async ({ page }) => {
    await page.goto("/projects")
    await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible()
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

    const robots = await request.get("/robots.txt")
    expect(await robots.text()).toContain("Sitemap: https://www.itsashik.dev/sitemap.xml")
  })

  test("Sanity Studio boots", async ({ page }) => {
    // The Studio bundle is large; the first cold load on the mobile profile can take a while.
    test.slow()
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    for (const path of ["/studio/inbox", "/studio"]) {
      await page.goto(path)
      await expect(page.locator("#sanity")).toBeAttached({ timeout: 60_000 })
    }
    await page.goto("/studio/content")
    // Signed out, the Studio shows its login screen, or (when this origin isn't in the project's
    // CORS list, as on localhost) its "connect this Studio" screen. Either means it booted.
    await expect(page.locator("#sanity")).toBeAttached({ timeout: 60_000 })
    await expect(
      page.getByText(/sign in|log in|choose login provider|connect this studio/i).first(),
    ).toBeVisible({
      timeout: 60_000,
    })
    expect(errors).toEqual([])
  })
})
