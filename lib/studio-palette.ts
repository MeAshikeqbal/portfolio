import { cyan, magenta, orange, purple, type ColorTintKey } from "@sanity/color"
import { clampChroma, formatHex, interpolate, parse, type Oklch } from "culori"

import type { ThemeTokens } from "./design-tokens"

/**
 * Turns the site's colour tokens (app/globals.css) into what the Sanity Studio theme needs:
 * hex values per token and a Sanity UI palette (a 50–950 ramp per hue).
 *
 * Sanity UI picks one tint per token and scheme (e.g. a card's border is gray/200 in light and
 * gray/800 in dark), so each ramp is anchored on the exact site tokens at the tints Sanity reads
 * for that role. Tints with no site token are interpolated between their neighbours.
 *
 * Pure (no fs), so the generator script and the drift test share it.
 */

export const TINTS = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
] as const satisfies readonly ColorTintKey[]

type Ramp = Record<ColorTintKey, string>
export type StudioPalette = {
  black: string
  white: string
  gray: Ramp
  red: Ramp
  orange: Ramp
  yellow: Ramp
  green: Ramp
  cyan: Ramp
  blue: Ramp
  purple: Ramp
  magenta: Ramp
}

/** Sanity hue → site status. Sanity's positive/caution/critical tones and links use these hues. */
const STATUS_HUES = { green: "up", yellow: "warn", red: "down", blue: "info" } as const

function oklch(value: string): Oklch {
  const colour = parse(value)
  if (!colour) throw new Error(`Unparseable colour: ${value}`)
  return interpolate([colour, colour], "oklch")(0) as Oklch
}

/** In-gamut sRGB hex (chroma reduced, lightness and hue kept). */
function hex(colour: Oklch | string): string {
  const c = typeof colour === "string" ? oklch(colour) : colour
  return formatHex(clampChroma(c, "oklch"))!
}

function mix(a: Oklch, b: Oklch, t: number): Oklch {
  return interpolate([a, b], "oklch")(t) as Oklch
}

/** Neutral ramp: every tint Sanity reads is a site token (see sanity/theme/index.ts). */
function grayRamp(light: ThemeTokens, dark: ThemeTokens): Ramp {
  return {
    "50": hex(light.background), // light page / pane chrome
    "100": hex(light["surface-2"]), // light hover, muted fills
    "200": hex(light.border), // light hairline
    "300": hex(light["border-strong"]), // light input stroke
    "400": hex(dark["muted-foreground"]), // dark muted ink
    "500": hex(light["status-idle"]), // idle dot
    "600": hex(light["muted-foreground"]), // light muted ink
    "700": hex(dark["border-strong"]), // dark input stroke
    "800": hex(dark.border), // dark hairline
    "900": hex(dark["surface-2"]), // dark hover, muted fills
    "950": hex(dark.surface), // dark panel
  }
}

/** Status ramp: soft tint, dot and text colour anchored for each scheme. */
function statusRamp(light: ThemeTokens, dark: ThemeTokens, status: string): Ramp {
  const softL = oklch(light[`status-${status}-soft`])
  const dotL = oklch(light[`status-${status}`])
  const fgL = oklch(light[`status-${status}-fg`])
  const fgD = oklch(dark[`status-${status}-fg`])
  const softD = oklch(dark[`status-${status}-soft`])
  return {
    "50": hex({ ...softL, l: 0.985, c: softL.c / 2 }),
    "100": hex(softL), // light badge / pill background
    "200": hex(mix(softL, fgD, 1 / 3)),
    "300": hex(mix(softL, fgD, 2 / 3)),
    "400": hex(fgD), // dark text
    "500": hex(dotL), // dot
    "600": hex(fgL), // light text
    "700": hex(mix(fgL, softD, 1 / 3)),
    "800": hex(mix(fgL, softD, 2 / 3)),
    "900": hex(softD), // dark badge / pill background
    "950": hex({ ...softD, l: Math.max(softD.l - 0.06, 0.12), c: softD.c * 0.8 }),
  }
}

/** Sanity's own ramp for hues the site doesn't use (syntax highlighting, avatars). */
function sanityRamp(tints: Record<ColorTintKey, { hex: string }>): Ramp {
  return Object.fromEntries(TINTS.map((tint) => [tint, tints[tint].hex])) as Ramp
}

export function buildStudioPalette(tokens: {
  light: ThemeTokens
  dark: ThemeTokens
}): StudioPalette {
  const { light, dark } = tokens
  const [green, yellow, red, blue] = (["green", "yellow", "red", "blue"] as const).map((hue) =>
    statusRamp(light, dark, STATUS_HUES[hue]),
  )
  return {
    black: hex(dark.background),
    white: hex(light.surface),
    gray: grayRamp(light, dark),
    red,
    orange: sanityRamp(orange),
    yellow,
    green,
    cyan: sanityRamp(cyan),
    blue,
    purple: sanityRamp(purple),
    magenta: sanityRamp(magenta),
  }
}

/** Site tokens the Studio's own components use (status pills, statusline), as hex per scheme. */
export const STUDIO_TOKENS = [
  "background",
  "surface",
  "surface-2",
  "foreground",
  "muted-foreground",
  "border",
  "border-strong",
  "ring",
  ...(["up", "warn", "down", "info", "idle"] as const).flatMap((s) => [
    `status-${s}`,
    `status-${s}-fg`,
    `status-${s}-soft`,
  ]),
] as const

export type StudioToken = (typeof STUDIO_TOKENS)[number]

export function buildStudioTokens(tokens: {
  light: ThemeTokens
  dark: ThemeTokens
}): Record<"light" | "dark", Record<StudioToken, string>> {
  const pick = (scheme: ThemeTokens) =>
    Object.fromEntries(STUDIO_TOKENS.map((name) => [name, hex(scheme[name])])) as Record<
      StudioToken,
      string
    >
  return { light: pick(tokens.light), dark: pick(tokens.dark) }
}
