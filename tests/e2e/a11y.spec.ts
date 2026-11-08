import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page, type TestInfo } from "@playwright/test"

/**
 * Accessibility audit (WCAG 2.1 AA rules).
 * Redesigned pages must have no serious or critical violations in either theme.
 * Pages not yet redesigned (the blog, until Phase 5) only block on critical ones.
 */
const STRICT_PAGES = ["/", "/projects", "/projects/portfolio", "/styleguide", "/no-such-page"]
const LEGACY_PAGES = ["/post"]

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

for (const path of LEGACY_PAGES) {
  test(`no critical axe violations on ${path}`, async ({ page }, testInfo) => {
    await page.goto(path)
    expect(await violations(page, testInfo, new Set(["critical"]))).toEqual([])
  })
}
