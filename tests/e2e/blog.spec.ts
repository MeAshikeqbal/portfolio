import { expect, test } from "@playwright/test"

const CODE_POST =
  "/post/a-beginner-s-guide-to-building-a-website-using-a-modern-javascript-framework"
const TOC_POST = "/post/why-i-started-self-hosting-ai-at-home"

test.describe("blog index", () => {
  test("search and topic filters narrow the list and live in the URL", async ({ page }) => {
    await page.goto("/post")
    const count = page.getByText(/\d+ of \d+ posts/)
    await expect(count).toBeVisible()
    const total = Number((await count.textContent())?.match(/of (\d+)/)?.[1])

    await page.getByRole("button", { name: "Homelab", exact: true }).click()
    await expect(page).toHaveURL(/category=Homelab/)
    await expect(page.getByRole("button", { name: "Homelab", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    const filtered = Number((await count.textContent())?.match(/^(\d+)/)?.[1])
    expect(filtered).toBeGreaterThan(0)
    expect(filtered).toBeLessThan(total)

    await page.getByLabel("Search posts").fill("zzz-no-such-post")
    await expect(page.getByText("No posts match these filters.")).toBeVisible()
  })

  test("a post's topic link opens the index filtered to that topic", async ({ page }) => {
    await page.goto(TOC_POST)
    await page
      .getByRole("list", { name: "Categories" })
      .getByRole("link", { name: "#homelab" })
      .click()
    await expect(page).toHaveURL(/\/post\?category=Homelab/)
    await expect(page.getByRole("button", { name: "Homelab", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })
})

test.describe("post page", () => {
  test("shows reading time, a working table of contents and related posts", async ({
    page,
    isMobile,
  }) => {
    await page.goto(TOC_POST)
    await expect(page.getByText(/\d+ min read/)).toBeVisible()

    if (isMobile) {
      await page.getByText("on this page").first().click()
    }
    const toc = isMobile
      ? page.locator("details")
      : page.getByRole("navigation", { name: "On this page" })
    const firstLink = toc.getByRole("link").first()
    const target = (await firstLink.getAttribute("href"))!
    await firstLink.click()
    await expect(page).toHaveURL(new RegExp(`${target}$`))
    await expect(page.locator(target)).toBeInViewport()

    await expect(page.getByText("related entries")).toBeVisible()
    await expect(page.getByRole("navigation", { name: "More posts" })).toBeVisible()
  })

  test("code blocks are highlighted on the server and copyable", async ({
    page,
    context,
    browserName,
  }) => {
    await page.goto(CODE_POST)
    const block = page.locator("figure.not-prose").first()
    await expect(block.locator("pre.shiki")).toBeVisible()
    await expect(block.locator("figcaption")).toContainText(/file\.js|javascript/i)

    if (browserName === "chromium") {
      await context.grantPermissions(["clipboard-read", "clipboard-write"])
      await block.getByRole("button", { name: "Copy code" }).click()
      await expect(block.getByRole("button", { name: "Copied" })).toBeVisible()
      expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("my-component")
    }
  })

  test("unknown posts return 404", async ({ page }) => {
    const response = await page.goto("/post/this-post-does-not-exist")
    expect(response?.status()).toBe(404)
    await expect(page.getByText("http 404")).toBeVisible()
  })
})
