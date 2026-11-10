import { expect, test, type Page } from "@playwright/test"

type Mode = "system" | "light" | "dark"

/**
 * Picks a theme the way a visitor would: the header's cycle button on desktop (clicked until
 * it names the mode), or the three-way switch in the mobile menu.
 */
async function chooseTheme(page: Page, mode: Mode) {
  const menu = page.getByRole("button", { name: "Toggle menu" })
  if (await menu.isVisible()) {
    if ((await menu.getAttribute("aria-expanded")) !== "true") await menu.click()
    const label = `${mode[0].toUpperCase()}${mode.slice(1)} theme`
    await page.getByRole("radio", { name: label }).locator("visible=true").first().click()
    return
  }
  const cycle = page.getByRole("button", { name: /^Colour theme: / })
  for (let i = 0; i < 3; i++) {
    if ((await cycle.getAttribute("aria-label")) === `Colour theme: ${mode}`) return
    await cycle.click()
  }
  await expect(cycle).toHaveAttribute("aria-label", `Colour theme: ${mode}`)
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
    await chooseTheme(page, "dark")
    await expect(page.locator("html")).toHaveClass(/\bdark\b/)

    await page.reload()
    await expect(page.locator("html")).toHaveClass(/\bdark\b/)

    await chooseTheme(page, "system")
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
      await page.goto(path, { waitUntil: "load" })
      // Not networkidle: Turnstile and the live-content connection keep the network busy.
      await page.waitForTimeout(1000)
      expect(errors).toEqual([])
    })
  }

  test("a post with code blocks hydrates without errors", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto("/post/why-i-started-self-hosting-ai-at-home", { waitUntil: "load" })
    await page.waitForTimeout(1000)
    expect(errors).toEqual([])
  })
})
