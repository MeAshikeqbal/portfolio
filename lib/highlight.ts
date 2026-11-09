import "server-only"

import { bundledLanguages, codeToHtml, type BundledLanguage } from "shiki"

const ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  yml: "yaml",
  md: "markdown",
  py: "python",
  plaintext: "text",
  txt: "text",
}

/** Maps a CMS language label to a Shiki language, falling back to plain text. */
export function resolveLanguage(language: string | null | undefined): BundledLanguage | "text" {
  const key = (language ?? "").trim().toLowerCase()
  const name = ALIASES[key] ?? key
  return name in bundledLanguages ? (name as BundledLanguage) : "text"
}

/**
 * Highlights code to HTML at build/render time. Both themes are emitted as CSS variables
 * (`--shiki-light` / `--shiki-dark`) and app/globals.css picks one per theme, so there is no
 * client-side highlighting and no flash when switching themes. Shiki escapes the code.
 *
 * `highlightLines` (1-based, as stored by Sanity's code input) get a `highlighted` class.
 */
export async function highlight(
  code: string,
  language?: string | null,
  { highlightLines = [] }: { highlightLines?: number[] } = {},
): Promise<string> {
  const marked = new Set(highlightLines)
  return codeToHtml(code, {
    lang: resolveLanguage(language),
    // The "-default" (Primer) variants meet WCAG AA contrast on our code background.
    themes: { light: "github-light-default", dark: "github-dark-default" },
    defaultColor: false,
    transformers: marked.size
      ? [
          {
            line(node, line) {
              if (marked.has(line)) this.addClassToHast(node, "highlighted")
            },
          },
        ]
      : [],
  })
}
