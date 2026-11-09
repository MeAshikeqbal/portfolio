import { buildTheme } from "@sanity/ui/theme"

/**
 * Studio theme: Sanity's default theme (light and dark, following the appearance menu or the
 * system) with the site's Geist fonts.
 *
 * Not `buildLegacyTheme`: Sanity treats a legacy theme as single-scheme, which locks the Studio
 * to light (or dark) and hides the appearance switch. Colours stay Sanity's defaults, which
 * already use blue for primary actions and green/amber/red for success/warning/danger.
 */
const base = buildTheme()

const SANS = "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
const MONO = "var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace"

export const studioTheme = {
  ...base,
  fonts: {
    ...base.fonts,
    text: { ...base.fonts.text, family: SANS },
    heading: { ...base.fonts.heading, family: SANS },
    label: { ...base.fonts.label, family: SANS },
    code: { ...base.fonts.code, family: MONO },
  },
}
