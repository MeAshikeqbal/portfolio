import { buildLegacyTheme } from "sanity"

/**
 * Studio theme matching the site's design tokens (app/globals.css; hex values as in lib/og.tsx):
 * a monochrome base where colour carries meaning, with green = success, amber = warning,
 * red = danger and the info blue for primary actions and focus (pure ink can't be a primary
 * colour that works in both light and dark Studio themes).
 */
const ink = "#0a0a0c"
const paper = "#f9fafb"
const info = "#3b82e0"
const up = "#2fa85a"
const warn = "#d77600"
const down = "#d6403a"

export const studioTheme = buildLegacyTheme({
  "--black": ink,
  "--white": paper,
  "--gray": "#71717a",
  "--gray-base": "#71717a",
  "--component-bg": paper,
  "--component-text-color": ink,

  "--brand-primary": info,
  "--focus-color": info,

  "--default-button-color": "#71717a",
  "--default-button-primary-color": info,
  "--default-button-success-color": up,
  "--default-button-warning-color": warn,
  "--default-button-danger-color": down,

  "--state-info-color": info,
  "--state-success-color": up,
  "--state-warning-color": warn,
  "--state-danger-color": down,

  "--main-navigation-color": ink,
  "--main-navigation-color--inverted": paper,

  "--font-family-base": "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  "--font-family-monospace": "var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace",
})
