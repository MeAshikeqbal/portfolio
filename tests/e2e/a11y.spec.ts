import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

/**
 * Accessibility audit. Until the Phase 8 accessibility pass, only `critical`
 * violations fail the run; everything else is attached to the report.
 */
const BLOCKING_IMPACTS = new Set(["critical"])

for (const path of ["/", "/post", "/projects"]) {
  test(`no blocking axe violations on ${path}`, async ({ page }, testInfo) => {
    await page.goto(path)
    await page.waitForLoadState("networkidle")
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()

    await testInfo.attach("axe-violations.json", {
      body: JSON.stringify(results.violations, null, 2),
      contentType: "application/json",
    })

    const blocking = results.violations.filter((v) => v.impact && BLOCKING_IMPACTS.has(v.impact))
    expect(blocking.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([])
  })
}

/** The style guide renders every token and component, so it gets the strict gate in both themes. */
for (const colorScheme of ["light", "dark"] as const) {
  test(`no serious axe violations on /styleguide (${colorScheme})`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme })
    await page.goto("/styleguide")
    await page.waitForLoadState("networkidle")
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()

    await testInfo.attach("axe-violations.json", {
      body: JSON.stringify(results.violations, null, 2),
      contentType: "application/json",
    })

    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    )
    expect(
      blocking.map(
        (v) =>
          `${v.id}: ${v.help} → ${v.nodes
            .map((n) => n.target.join(" "))
            .slice(0, 3)
            .join(", ")}`,
      ),
    ).toEqual([])
  })
}
