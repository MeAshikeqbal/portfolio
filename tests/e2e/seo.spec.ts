import { expect, test, type Page } from "@playwright/test"

async function structuredData(page: Page) {
  const raw = await page.locator('script[type="application/ld+json"]').first().textContent()
  return JSON.parse(raw ?? "{}") as { "@graph": { "@type": string; [key: string]: unknown }[] }
}

/** The og:image URL, rewritten to the local server (metadata uses the production origin). */
async function ogImage(page: Page): Promise<string> {
  const url = await page.locator('meta[property="og:image"]').getAttribute("content")
  expect(url).toBeTruthy()
  const parsed = new URL(url!)
  return `${parsed.pathname}${parsed.search}`
}

test.describe("seo", () => {
  for (const path of ["/", "/post/why-i-started-self-hosting-ai-at-home", "/projects/portfolio"]) {
    test(`${path} has a generated 1200×630 share image`, async ({ page, request }) => {
      await page.goto(path)
      const image = await request.get(await ogImage(page))
      expect(image.status()).toBe(200)
      expect(image.headers()["content-type"]).toBe("image/png")
      const png = await image.body()
      // PNG IHDR: width and height are big-endian uint32 at bytes 16–23.
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630])
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        "content",
        "summary_large_image",
      )
    })
  }

  test("home describes the person and the website", async ({ page }) => {
    await page.goto("/")
    const types = (await structuredData(page))["@graph"].map((thing) => thing["@type"])
    expect(types).toEqual(["Person", "WebSite"])
  })

  test("posts are BlogPostings with breadcrumbs", async ({ page }) => {
    await page.goto("/post/why-i-started-self-hosting-ai-at-home")
    const [article, breadcrumbs] = (await structuredData(page))["@graph"]
    expect(article["@type"]).toBe("BlogPosting")
    expect(article.headline).toBe(await page.getByRole("heading", { level: 1 }).textContent())
    expect(article.datePublished).toBeTruthy()
    expect(breadcrumbs["@type"]).toBe("BreadcrumbList")
  })

  test("projects are SoftwareSourceCode with a repository", async ({ page }) => {
    await page.goto("/projects/portfolio")
    const [project] = (await structuredData(page))["@graph"]
    expect(project["@type"]).toBe("SoftwareSourceCode")
    expect(project.codeRepository).toMatch(/github\.com/)
  })

  test("the web manifest is served with the brand colours", async ({ request }) => {
    const manifest = await (await request.get("/manifest.webmanifest")).json()
    expect(manifest.theme_color).toBe("#0a0a0c")
    expect(manifest.icons.length).toBeGreaterThan(0)
  })
})
