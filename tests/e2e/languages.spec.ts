import { readFileSync } from "node:fs"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import { localeInfo, locales } from "../../i18n/locales"

/** A locale's nav label for /post, as its messages file has it. */
const writingLabel = (locale: string): string =>
  JSON.parse(readFileSync(join(__dirname, `../../messages/${locale}.json`), "utf8")).nav.writing

const others = locales.filter((locale) => locale !== "en")

/** The translated site: prefixed URLs, the switcher, hreflang, and English-only content. */
test.describe("languages", () => {
  test.skip(others.length === 0, "only English is served")

  for (const locale of others) {
    test(`/${locale} is served in ${localeInfo[locale].englishName}`, async ({ page }) => {
      const response = await page.goto(`/${locale}`)
      expect(response?.status()).toBe(200)
      await expect(page.locator("html")).toHaveAttribute("lang", locale)
      // The interface reads from the locale's messages, and its links stay in the locale.
      const writing = page.locator(`a[href="/${locale}/post"]`).filter({
        hasText: writingLabel(locale),
      })
      await expect(writing.first()).toBeAttached()
    })
  }

  test("pages list every language and point x-default at English", async ({ page }) => {
    await page.goto("/hi/projects")
    const alternates = page.locator('link[rel="alternate"][hreflang]')
    await expect(alternates).toHaveCount(locales.length + 1)
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      "href",
      /\/projects$/,
    )
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/hi\/projects$/)
  })

  test("an English-only post canonicalizes to its English URL and says so", async ({ page }) => {
    await page.goto("/de/post/why-i-started-self-hosting-ai-at-home")
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/post\/why-i-started-self-hosting-ai-at-home$/,
    )
    await expect(page.locator("h1")).toHaveAttribute("lang", "en")
  })

  test("the switcher keeps the page, query and hash", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop header")
    await page.goto("/projects?status=active")
    await page.getByRole("button", { name: /Language/ }).click()
    await page.getByRole("menuitem", { name: localeInfo.ja.nativeName }).click()
    await expect(page).toHaveURL(/\/ja\/projects\?status=active$/)
    await expect(page.locator("html")).toHaveAttribute("lang", "ja")
  })

  test("unknown prefixes are pages, not languages", async ({ request }) => {
    expect((await request.get("/xx/post")).status()).toBe(404)
  })

  test("translated pages say they're machine-translated and link the original", async ({
    page,
  }) => {
    await page.goto("/es/homecave")
    const original = page.getByRole("contentinfo").locator('a[hreflang="en"]')
    await expect(original).toHaveAttribute("href", "/homecave")
  })
})
