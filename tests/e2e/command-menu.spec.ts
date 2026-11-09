import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test.describe("command palette", () => {
  test("opens with Ctrl+K and jumps to a post", async ({ page }) => {
    await page.goto("/")
    await page.keyboard.press("Control+k")
    const dialog = page.getByRole("dialog", { name: "Search and commands" })
    await expect(dialog).toBeVisible()

    await page.keyboard.type("self-hosting ai")
    await expect(dialog.getByRole("option", { name: /Self-Hosting AI/i }).first()).toBeVisible()
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/\/post\/why-i-started-self-hosting-ai-at-home/)
    await expect(dialog).toBeHidden()
  })

  test("'/' opens it, but not while typing in a field", async ({ page }) => {
    await page.goto("/projects")
    await page.getByLabel("Filter projects").click()
    await page.keyboard.type("/")
    await expect(page.getByRole("dialog")).toBeHidden()
    await expect(page.getByLabel("Filter projects")).toHaveValue("/")

    await page.locator("body").click({ position: { x: 5, y: 300 } })
    await page.keyboard.press("/")
    await expect(page.getByRole("dialog", { name: "Search and commands" })).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).toBeHidden()
  })

  test("the header button opens it and actions run", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" })
    await page.goto("/")
    await page.getByRole("button", { name: "Search and commands" }).click()
    await page.getByRole("option", { name: "Switch to dark theme" }).click()
    await expect(page.locator("html")).toHaveClass(/\bdark\b/)
  })

  test("navigates to home-page sections", async ({ page }) => {
    await page.goto("/post")
    await page.getByRole("button", { name: "Search and commands" }).click()
    await page.keyboard.type("stack")
    await page.getByRole("option", { name: /Stack/ }).first().click()
    await expect(page).toHaveURL(/\/#inventory$/)
  })

  test("has no serious accessibility violations while open", async ({ page }) => {
    await page.goto("/")
    await page.keyboard.press("Control+k")
    await expect(page.getByRole("dialog")).toBeVisible()
    const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze()
    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    )
    expect(blocking.map((v) => `${v.id}: ${v.help}`)).toEqual([])
  })
})
