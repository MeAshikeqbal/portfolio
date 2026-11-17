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

test.describe("plain text", () => {
  const curl = { "user-agent": "curl/8.9.1", accept: "*/*" }

  test("curl gets the home page as text; a browser still gets HTML", async ({ request }) => {
    const text = await request.get("/", { headers: curl })
    expect(text.headers()["content-type"]).toBe("text/plain; charset=utf-8")
    expect(await text.text()).toContain("── writing")
    const html = await request.get("/", { headers: { accept: "text/html" } })
    expect(html.headers()["content-type"]).toContain("text/html")
  })

  test("curl gets the text résumé at /resume; browsers keep the PDF redirect", async ({
    request,
  }) => {
    const text = await request.get("/resume", { headers: curl, maxRedirects: 0 })
    expect(text.status()).toBe(200)
    expect(await text.text()).toMatch(/^# Ashik Eqbal/)
    const browser = await request.get("/resume", { maxRedirects: 0 })
    expect(browser.headers().location).toContain("/resume.pdf")
  })

  test("llms.txt, llms-full.txt and resume.md are served", async ({ request }) => {
    const llms = await request.get("/llms.txt")
    expect(await llms.text()).toMatch(/^# Ashik Eqbal\n\n> /)
    expect((await request.get("/llms-full.txt")).status()).toBe(200)
    const resume = await request.get("/resume.md")
    expect(resume.headers()["content-type"]).toBe("text/markdown; charset=utf-8")
  })
})
