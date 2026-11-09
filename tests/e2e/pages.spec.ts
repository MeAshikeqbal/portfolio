import { expect, test } from "@playwright/test"

test.describe("home", () => {
  test("shows live stats and links services to their pages", async ({ page }) => {
    await page.goto("/")
    const stats = page.locator("#home dl")
    await expect(stats.getByText("posts")).toBeVisible()
    await expect(page.locator("#services a[href^='/projects/']").first()).toBeVisible()
    await expect(page.locator("#writing a[href^='/post/']").first()).toBeVisible()
  })

  test("the inventory expands to show every skill without JavaScript-only controls", async ({
    page,
  }) => {
    await page.goto("/")
    const inventory = page.locator("#inventory")
    const visibleBefore = await inventory.locator("li:visible").count()
    const toggle = inventory.getByText(/^Show all \d+$/)
    await toggle.scrollIntoViewIfNeeded()
    await toggle.click()
    await expect(inventory.getByRole("checkbox")).toBeChecked()
    await expect(inventory.getByText("Show fewer")).toBeVisible()
    expect(await inventory.locator("li:visible").count()).toBeGreaterThan(visibleBefore)
  })

  test("nav links reach each section and page", async ({ page, isMobile }) => {
    await page.goto("/")
    if (isMobile) await page.getByRole("button", { name: "Toggle menu" }).click()
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Projects" })
      .first()
      .click()
    await expect(page).toHaveURL(/\/projects$/)
    // The desktop nav stays in the DOM on phones (just hidden), so check its current link.
    await expect(page.locator('nav[aria-label="Main"] a[aria-current="page"]').first()).toHaveText(
      "Projects",
    )
  })
})

test.describe("contact", () => {
  test("server-side validation errors appear inline and keep what was typed", async ({ page }) => {
    await page.goto("/#contact")
    const form = page.locator("#contact form")
    // Skip the browser's native checks to exercise the server action's validation.
    await form.evaluate((el) => el.setAttribute("novalidate", ""))
    await page.getByLabel("Name").fill("Ada Lovelace")
    await page.getByLabel("Email").fill("not-an-email")
    await page.getByLabel("Message").fill("short")
    await page.getByRole("button", { name: "Send message" }).click()

    await expect(page.getByText("Please enter a valid email address.")).toBeVisible()
    await expect(page.getByText("Message must be at least 10 characters.")).toBeVisible()
    // Scoped to the form: Next.js also renders a role="alert" route announcer.
    await expect(form.getByRole("alert")).toContainText("Please fix the highlighted fields.")
    await expect(page.getByLabel("Name")).toHaveValue("Ada Lovelace")
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true")
  })

  test("a filled honeypot looks successful to bots but sends nothing", async ({ page }) => {
    await page.goto("/#contact")
    const form = page.locator("#contact form")
    await form.evaluate((el) => {
      el.setAttribute("novalidate", "")
      const trap = el.querySelector<HTMLInputElement>('input[name="hp_field_7c1"]')
      if (trap) trap.value = "Spam Inc"
    })
    await page.getByRole("button", { name: "Send message" }).click()
    await expect(page.getByText("message sent")).toBeVisible()
  })
})

test.describe("projects", () => {
  test("search filters the grid and is kept in the URL", async ({ page }) => {
    await page.goto("/projects")
    const count = page.getByText(/\d+ of \d+ shown/)
    await expect(count).toBeVisible()
    await page.getByLabel("Filter projects").fill("portfolio")
    await expect(page).toHaveURL(/\?q=portfolio/)
    await expect(count).toHaveText(/^1 of \d+ shown$/)

    await page.reload()
    await expect(page.getByLabel("Filter projects")).toHaveValue("portfolio")
    await expect(count).toHaveText(/^1 of \d+ shown$/)
  })

  test("the search box follows navigation back to an unfiltered list", async ({ page }) => {
    await page.goto("/projects?q=portfolio")
    await expect(page.getByLabel("Filter projects")).toHaveValue("portfolio")
    await page.goto("/")
    await page.goBack()
    await expect(page.getByLabel("Filter projects")).toHaveValue("portfolio")
    // Clicking the nav link lands on a clean /projects and the input clears with it.
    await page.locator('a[href="/projects"]').last().click()
    await expect(page).toHaveURL(/\/projects$/)
    await expect(page.getByLabel("Filter projects")).toHaveValue("")
    await expect(page.getByText(/^(\d+) of \1 shown$/)).toBeVisible()
  })

  test("a case study page renders its metrics and links", async ({ page }) => {
    await page.goto("/projects/portfolio")
    await expect(page.getByRole("heading", { level: 1, name: "Portfolio" })).toBeVisible()
    await expect(page.getByText("commits", { exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: /Source on GitHub/ })).toHaveAttribute(
      "href",
      /github\.com/,
    )
  })

  test("unknown case studies 404", async ({ page }) => {
    const response = await page.goto("/projects/does-not-exist")
    expect(response?.status()).toBe(404)
    await expect(page.getByText("http 404")).toBeVisible()
  })
})

test("the 404 page explains the incident and links home", async ({ page }) => {
  const response = await page.goto("/no/such/page")
  expect(response?.status()).toBe(404)
  await expect(
    page.getByRole("heading", { level: 1, name: "Nothing is running here" }),
  ).toBeVisible()
  await expect(page.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/")
})
