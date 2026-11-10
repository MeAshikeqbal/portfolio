import { buildTheme, type ThemeColorStatesTokens, type ThemeColorTokens } from "@sanity/ui/theme"

import { palette } from "./tokens.generated"

/**
 * Studio theme in the site's design language (DESIGN.md): cool-grey monochrome, colour only for
 * status, primary actions in inverted ink, 1px hairlines, small radii, Geist / Geist Mono.
 *
 * How it maps: `palette` (generated from app/globals.css by `npm run studio:tokens`) puts the
 * site's exact tokens on the tints Sanity UI reads, e.g. gray/200 is the light hairline and
 * gray/800 the dark one, green/100 / 600 / 500 are status-up's soft tint, text and dot. The
 * `color` overrides below re-point the few roles whose default tint isn't the site's choice.
 * Token values are [light, dark].
 *
 * `buildTheme`, not `buildLegacyTheme`: the legacy builder is single-scheme, which would lock the
 * Studio to one appearance and hide the light/dark/system switch.
 *
 * Shadows stay Sanity's defaults: level 1 is a flat outline and only floating layers (popovers,
 * menus, tooltips, dialogs) use the deeper levels, which is the site's "only overlays float" rule.
 */

/** Inverted ink, as on the site's primary button: ink fill, background-coloured text. */
const INK_BUTTON: ThemeColorStatesTokens = {
  "*": { _hue: "gray", bg: ["900", "100"], fg: ["white", "black"] },
  hovered: { bg: ["800", "200"] },
  pressed: { bg: ["black", "white"] },
  selected: { bg: ["black", "white"] },
}

const color: ThemeColorTokens = {
  base: {
    "*": {
      // Info blue for focus and links (the site's ring and prose links).
      focusRing: ["blue/500", "blue/400"],
      link: { fg: ["blue/600", "blue/400"] },
      // Status pills: soft tint, -fg text, dot (StatusPill on the site).
      badge: { "*": { bg: ["100", "900"], fg: ["600", "400"], dot: ["500", "500"] } },
    },
    default: {
      fg: ["900", "100"],
      muted: { fg: ["600", "400"] },
    },
    positive: { badge: { "*": { bg: ["100", "900"], fg: ["600", "400"] } } },
    caution: { badge: { "*": { bg: ["100", "900"], fg: ["600", "400"] } } },
  },
  button: {
    default: {
      // Solid status buttons (Delete is critical) on the -fg tint, so white text stays ≥ 4.5:1.
      "*": {
        "*": { bg: ["600", "400"] },
        hovered: { bg: ["700", "300"] },
        pressed: { bg: ["800", "200"] },
        selected: { bg: ["800", "200"] },
      },
      default: INK_BUTTON,
      primary: INK_BUTTON,
    },
    bleed: {
      "*": {
        // Hover on surface-2, like rows and ghost buttons on the site.
        hovered: { bg: ["100", "900"] },
      },
    },
  },
  input: {
    "*": {
      "*": {
        bg: ["white", "950"],
        border: ["300", "700"], // strong hairline
        fg: ["900", "100"],
        placeholder: ["600", "400"], // muted ink
      },
      hovered: { border: ["400", "600"] },
      readOnly: { bg: ["50", "900"] },
    },
  },
  selectable: {
    "*": {
      hovered: { bg: ["100", "900"] },
      pressed: { bg: ["200", "800"] },
    },
    // Selected list items read like the site's active filter chip: inverted ink, not blue.
    default: { selected: { _hue: "gray", bg: ["900", "100"], border: ["900", "100"] } },
  },
}

const SANS = "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
const MONO = "var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace"

const fontsBase = buildTheme().fonts

export const studioTheme = buildTheme({
  palette,
  color,
  // [none, 2px chips, 4px buttons and inputs, 6px panels, 10px overlays, …]
  radius: [0, 2, 4, 6, 10, 12, 21],
  button: {
    textWeight: "medium",
    border: { width: 1 },
    focusRing: { offset: 1, width: 2 },
  },
  card: {
    border: { width: 1 },
    // Inset, so rows inside clipped panes keep a visible ring (the site's -2px rule).
    focusRing: { offset: -2, width: 2 },
    shadow: { outline: 0.5 },
  },
  font: {
    ...fontsBase,
    text: { ...fontsBase.text, family: SANS },
    heading: { ...fontsBase.heading, family: SANS },
    label: { ...fontsBase.label, family: SANS },
    code: { ...fontsBase.code, family: MONO },
  },
})
