// @vitest-environment node
import { describe, expect, it } from "vitest"

import { contrastRatio, readThemeTokens } from "@/lib/design-tokens"
import { buildStudioPalette, buildStudioTokens } from "@/lib/studio-palette"
import { studioTheme } from "@/sanity/theme"
import { palette, tokens } from "@/sanity/theme/tokens.generated"

/**
 * The Studio theme is generated from the site's tokens (scripts/studio-tokens.ts). These tests
 * fail when the generated file drifts from app/globals.css, and check contrast on the colours the
 * built theme actually renders (Sanity UI blends tints over the card background).
 */

const site = readThemeTokens()
const ratio = (fg: string, bg: string) => contrastRatio({}, fg, bg)

describe("generated Studio tokens", () => {
  it("match app/globals.css (run `npm run studio:tokens` after changing a token)", () => {
    expect(palette).toEqual(buildStudioPalette(site))
    expect(tokens).toEqual(buildStudioTokens(site))
  })
})

describe.each(["light", "dark"] as const)("%s Studio theme", (scheme) => {
  const theme = studioTheme.v2
  if (!theme) throw new Error("buildTheme returned no v2 theme")
  const colors = theme.color[scheme].default
  const pane = colors.bg

  it("puts panes on the site's surface with ink text", () => {
    expect(pane).toBe(tokens[scheme].surface)
    // Sanity screen-blends tints over dark panes, so the dark hairline lands a shade lighter.
    expect(ratio(colors.border, tokens[scheme].border)).toBeLessThan(1.1)
    expect(ratio(colors.fg, pane)).toBeGreaterThanOrEqual(7)
    expect(ratio(colors.muted.fg, pane)).toBeGreaterThanOrEqual(4.5)
  })

  it("draws primary and default buttons in readable inverted ink, not blue", () => {
    for (const tone of ["primary", "default"] as const) {
      const button = colors.button.default[tone]
      for (const state of ["enabled", "hovered", "pressed"] as const) {
        expect(
          ratio(button[state].fg, button[state].bg),
          `${tone} ${state}`,
        ).toBeGreaterThanOrEqual(4.5)
      }
      // Ink, i.e. a neutral: the same lightness gap to the pane as the site's foreground.
      expect(ratio(button.enabled.bg, pane), tone).toBeGreaterThanOrEqual(7)
    }
  })

  it("keeps solid status buttons readable", () => {
    for (const tone of ["positive", "caution", "critical"] as const) {
      const { bg, fg } = colors.button.default[tone].enabled
      expect(ratio(fg, bg), tone).toBeGreaterThanOrEqual(4.5)
    }
  })

  it("renders status badges as the site's pills: readable text on the soft tint", () => {
    for (const tone of ["positive", "caution", "critical", "primary"] as const) {
      const badge = colors.badge[tone]
      expect(ratio(badge.fg, badge.bg), tone).toBeGreaterThanOrEqual(4.5)
      expect(ratio(badge.dot, pane), `${tone} dot`).toBeGreaterThanOrEqual(3)
    }
  })

  it("shows a visible focus ring and readable inputs", () => {
    expect(ratio(colors.focusRing, pane)).toBeGreaterThanOrEqual(3)
    const input = colors.input.default.enabled
    expect(ratio(input.fg, input.bg)).toBeGreaterThanOrEqual(7)
    expect(ratio(input.placeholder, input.bg)).toBeGreaterThanOrEqual(4.5)
  })

  it("marks selected list items in inverted ink with readable text", () => {
    const selected = colors.selectable.default.selected
    expect(ratio(selected.fg, selected.bg)).toBeGreaterThanOrEqual(7)
    expect(ratio(selected.muted.fg, selected.bg)).toBeGreaterThanOrEqual(4.5)
  })
})
