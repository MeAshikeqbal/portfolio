import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page, type TestInfo } from "@playwright/test"
import { ABOUT_PAGES, ABOUT_PATHS } from "./about-state"

/**
 * Accessibility audit (WCAG 2.1 AA rules).
 * Every page must have no serious or critical violations in either theme.
 */
const STRICT_PAGES = [
  "/",
  "/post",
  "/post/why-i-started-self-hosting-ai-at-home",
  "/post/a-beginner-s-guide-to-building-a-website-using-a-modern-javascript-framework",
  "/projects",
  "/projects/portfolio",
  "/styleguide",
  "/no-such-page",
  // Only exist once published (scripts/about-state.mjs decides before the build).
  ...(ABOUT_PAGES === "published" ? ABOUT_PATHS : []),
]

async function violations(page: Page, testInfo: TestInfo, impacts: Set<string>) {
  await page.waitForLoadState("load")
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze()
  await testInfo.attach("axe-violations.json", {
    body: JSON.stringify(results.violations, null, 2),
    contentType: "application/json",
  })
  return results.violations
    .filter((v) => v.impact && impacts.has(v.impact))
    .map(
      (v) =>
        `${v.id}: ${v.help} → ${v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(" "))
          .join(", ")}`,
    )
}

for (const colorScheme of ["light", "dark"] as const) {
  for (const path of STRICT_PAGES) {
    test(`no serious axe violations on ${path} (${colorScheme})`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme })
      await page.goto(path)
      expect(await violations(page, testInfo, new Set(["serious", "critical"]))).toEqual([])
    })
  }
}
