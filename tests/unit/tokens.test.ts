// @vitest-environment node
import { describe, expect, it } from "vitest"
import { contrastRatio as contrast, readThemeTokens } from "@/lib/design-tokens"

/**
 * Guards the colour tokens in app/globals.css against accessibility regressions.
 * WCAG AA: 4.5:1 for text, 3:1 for non-text UI (status dots, focus ring).
 */
const themes = readThemeTokens()
const STATUSES = ["up", "warn", "down", "info", "idle"] as const
const SURFACES = ["background", "surface", "surface-2"] as const

describe.each(Object.entries(themes))("%s theme tokens", (_theme, tokens) => {
  it.each(SURFACES)("body and muted text are readable on %s", (surface) => {
    expect(contrast(tokens, "foreground", surface)).toBeGreaterThanOrEqual(7)
    expect(contrast(tokens, "muted-foreground", surface)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(STATUSES)("status %s: text is readable and the dot is visible", (status) => {
    const fg = `status-${status}-fg`
    expect(contrast(tokens, fg, `status-${status}-soft`)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(tokens, fg, "surface")).toBeGreaterThanOrEqual(4.5)
    expect(contrast(tokens, fg, "background")).toBeGreaterThanOrEqual(4.5)
    expect(contrast(tokens, `status-${status}`, "surface")).toBeGreaterThanOrEqual(3)
  })

  it("focus ring is visible and destructive buttons are readable", () => {
    expect(contrast(tokens, "ring", "background")).toBeGreaterThanOrEqual(3)
    expect(contrast(tokens, "#ffffff", "destructive")).toBeGreaterThanOrEqual(4.5)
  })

  it("defines every status token", () => {
    for (const status of STATUSES) {
      for (const suffix of ["", "-fg", "-soft"]) {
        expect(tokens[`status-${status}${suffix}`], `status-${status}${suffix}`).toBeDefined()
      }
    }
  })
})
