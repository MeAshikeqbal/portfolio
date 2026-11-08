import { expect, test, type Page } from "@playwright/test"

/** Opens the mobile menu when the desktop nav is hidden, so the theme toggle is reachable. */
async function revealThemeToggle(page: Page) {
  const menu = page.getByRole("button", { name: "Toggle menu" })
  if (await menu.isVisible()) await menu.click()
}

function themeButton(page: Page, name: "System theme" | "Light theme" | "Dark theme") {
  return page.getByRole("radio", { name }).locator("visible=true").first()
}

test.describe("theme", () => {
  test("follows the system colour scheme by default", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" })
    await page.goto("/")
    await expect(page.locator("html")).toHaveClass(/\bdark\b/)

    await page.emulateMedia({ colorScheme: "light" })
    await page.goto("/")
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/)
  })

  test("the toggle overrides the system and persists across reloads", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" })
    await page.goto("/")
    await revealThemeToggle(page)
    await themeButton(page, "Dark theme").click()
    await expect(page.locator("html")).toHaveClass(/\bdark\b/)

    await page.reload()
    await expect(page.locator("html")).toHaveClass(/\bdark\b/)

    await revealThemeToggle(page)
    await themeButton(page, "System theme").click()
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/)
  })
})

test.describe("hydration", () => {
  for (const path of ["/", "/post", "/projects", "/styleguide"]) {
    test(`${path} hydrates without errors`, async ({ page }) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      page.on("console", (message) => {
        if (message.type() === "error" && /hydrat|#418|#423|did not match/i.test(message.text())) {
          errors.push(message.text())
        }
      })
      await page.goto(path, { waitUntil: "networkidle" })
      expect(errors).toEqual([])
    })
  }

  test("a post with code blocks hydrates without errors", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto("/post/why-i-started-self-hosting-ai-at-home", { waitUntil: "networkidle" })
    expect(errors).toEqual([])
  })
})
