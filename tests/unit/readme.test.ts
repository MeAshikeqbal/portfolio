import { toHtml } from "hast-util-to-html"
import { describe, expect, it } from "vitest"
import { isBoilerplateReadme, readmeTree, type ReadmeSource } from "@/lib/readme"

const source: ReadmeSource = { owner: "me", repo: "tool", ref: "main", path: "README.md" }
const html = (markdown: string, from: ReadmeSource = source) => toHtml(readmeTree(markdown, from))

describe("readmeTree", () => {
  it("drops the leading H1 and moves every other heading down a level, with readme- ids", () => {
    const out = html("# tool\n\nIntro.\n\n## Features\n\n### Install")
    expect(out).not.toContain("<h1")
    expect(out).toContain('<h3 id="readme-features">Features</h3>')
    expect(out).toContain('<h4 id="readme-install">Install</h4>')
  })

  it("keeps an H1 that isn't the first thing in the README", () => {
    expect(html("Intro.\n\n# Usage")).toContain('<h2 id="readme-usage">Usage</h2>')
  })

  it("points in-page anchors at the readme- ids", () => {
    expect(html("[Go](#features)")).toContain('href="#readme-features"')
  })

  it("resolves relative images to raw files and relative links to GitHub", () => {
    const out = html("![shot](docs/img/a.png) [guide](CONFIG.md) ![root](/public/b.png)")
    expect(out).toContain('src="https://raw.githubusercontent.com/me/tool/main/docs/img/a.png"')
    expect(out).toContain('src="https://raw.githubusercontent.com/me/tool/main/public/b.png"')
    expect(out).toContain('href="https://github.com/me/tool/blob/main/CONFIG.md"')
  })

  it("resolves relative to a README in a subdirectory", () => {
    const out = html("![a](img/a.png)", { ...source, path: "docs/README.md" })
    expect(out).toContain("https://raw.githubusercontent.com/me/tool/main/docs/img/a.png")
  })

  it("turns github.com blob image URLs into raw files", () => {
    expect(html("![a](https://github.com/me/tool/blob/main/a.gif)")).toContain(
      'src="https://raw.githubusercontent.com/me/tool/main/a.gif"',
    )
  })

  it("drops badges and images from hosts outside the CSP, with the links and paragraphs they leave empty", () => {
    const out = html(
      "[![build](https://img.shields.io/badge/x-y-green)](https://ci.example.com) " +
        "![wk](https://wakatime.com/badge/user/1.svg)\n\n![ext](https://example.com/a.png)\n\nText.",
    )
    expect(out).not.toContain("<img")
    expect(out).not.toContain("ci.example.com")
    expect(out.trim()).toBe("<p>Text.</p>")
  })

  it("keeps user-attachment images and opens external links in a new tab", () => {
    const out = html(
      "![demo](https://github.com/user-attachments/assets/abc) [site](https://example.com)",
    )
    expect(out).toContain('src="https://github.com/user-attachments/assets/abc"')
    expect(out).toContain('loading="lazy"')
    expect(out).toContain('target="_blank" rel="noopener noreferrer"')
  })

  it("sanitizes raw HTML like GitHub does", () => {
    const out = html(
      '<div align="center"><script>alert(1)</script><img src="docs/a.png" onerror="alert(1)" width="72"><a href="javascript:alert(1)">x</a></div>\n\n<iframe src="https://evil.example"></iframe><style>body{}</style>',
    )
    expect(out).not.toMatch(/script|onerror|javascript:|iframe|<style|align=/)
    expect(out).toContain('src="https://raw.githubusercontent.com/me/tool/main/docs/a.png"')
    expect(out).toContain('width="72"')
  })

  it("keeps code language classes for highlighting", () => {
    expect(html("```bash\nnpm i\n```")).toContain('<code class="language-bash">')
  })
})

describe("isBoilerplateReadme", () => {
  it("spots framework starter READMEs", () => {
    expect(
      isBoilerplateReadme(
        "This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://x).",
      ),
    ).toBe(true)
    expect(
      isBoilerplateReadme(
        "# sv\n\nEverything you need to build a Svelte project, powered by [`sv`](https://x).",
      ),
    ).toBe(true)
  })

  it("keeps real READMEs, even ones that mention the starter later on", () => {
    expect(isBoilerplateReadme("# Helper Scripts TUI\n\nA terminal UI for Proxmox.")).toBe(false)
  })
})
