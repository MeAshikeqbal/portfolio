import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { parse, wcagContrast } from "culori"

export type ThemeTokens = Record<string, string>

/** Reads the raw `--token: value` declarations for light (`:root`) and dark (`.dark`) from app/globals.css. */
export function readThemeTokens(): { light: ThemeTokens; dark: ThemeTokens } {
  const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8")
  return { light: readBlock(css, /^:root[,\s]/m), dark: readBlock(css, /^\.dark \{/m) }
}

function readBlock(css: string, selector: RegExp): ThemeTokens {
  const match = selector.exec(css)
  if (!match) throw new Error(`Token block ${selector} not found in app/globals.css`)
  const block = css.slice(match.index, css.indexOf("}", match.index))
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
  )
}

/** WCAG 2 contrast ratio between two token names (or literal CSS colours). */
export function contrastRatio(tokens: ThemeTokens, fg: string, bg: string): number {
  const a = parse(tokens[fg] ?? fg)
  const b = parse(tokens[bg] ?? bg)
  if (!a || !b) throw new Error(`Unparseable colour: ${fg} / ${bg}`)
  return wcagContrast(a, b)
}
