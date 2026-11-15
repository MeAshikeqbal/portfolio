/**
 * A project's GitHub README, made safe and on-brand for the project page.
 *
 * Markdown (GFM, with raw HTML) -> HTML tree -> sanitized with GitHub's own allow-list
 * (hast-util-sanitize's default schema), then adapted:
 * - relative links point at the file on GitHub, relative images at raw.githubusercontent.com;
 * - images only from GitHub hosts (the CSP's img-src); badges and other hosts are dropped,
 *   along with any link or paragraph left empty;
 * - the leading H1 (the project name, already the page title) is dropped and every other
 *   heading moves one level down, under the page's "README" heading;
 * - headings get "readme-" ids and in-page "#…" links follow them, so they can't collide with
 *   the case study's anchors;
 * - presentational attributes (align, width on non-images) are removed; external links open
 *   in a new tab.
 */
import GithubSlugger from "github-slugger"
import type { Element, ElementContent, Root } from "hast"
import rehypeRaw from "rehype-raw"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified } from "unified"
import { SKIP, visit } from "unist-util-visit"

export interface ReadmeSource {
  owner: string
  repo: string
  /** Branch or commit the README was read from. */
  ref: string
  /** README path in the repository, e.g. "README.md" or "docs/README.md". */
  path: string
}

/** Image hosts the site's CSP allows (next.config.ts img-src). */
export const README_IMAGE_HOSTS = ["raw.githubusercontent.com", "github.com"]
const IMAGE_HOST_SUFFIX = ".githubusercontent.com"

/** Hosts that serve status badges: never worth showing on the page. */
const BADGE_HOSTS =
  /(^|\.)(shields\.io|badgen\.net|wakatime\.com|vercel\.app|deepsource\.io|codecov\.io|travis-ci\.(org|com)|circleci\.com)$/i
const BADGE_PATH = /\/(badge|badges)(\/|\.svg|$)|\/workflows\/.+\/badge\.svg/i

/**
 * Framework starter READMEs ("This is a Next.js project bootstrapped with…", the Svelte `sv`
 * template, Create React App, Remix): they describe the template, not the project.
 */
export function isBoilerplateReadme(markdown: string): boolean {
  const text = markdown.slice(0, 600)
  return (
    /bootstrapped with \[?`?create-next-app/i.test(text) ||
    /Everything you need to build a Svelte project/i.test(text) ||
    /bootstrapped with \[?Create React App/i.test(text) ||
    /^#\s*Welcome to Remix/im.test(text)
  )
}

function isAllowedImageHost(host: string): boolean {
  return README_IMAGE_HOSTS.includes(host) || host.endsWith(IMAGE_HOST_SUFFIX)
}

function isBadge(url: URL): boolean {
  return (
    BADGE_HOSTS.test(url.hostname) ||
    (url.hostname.endsWith("github.com") && BADGE_PATH.test(url.pathname))
  )
}

/** Resolves a README-relative URL. Paths starting with "/" are relative to the repository root. */
function resolve(href: string, base: string, source: ReadmeSource): URL | null {
  try {
    const dir = source.path.includes("/")
      ? source.path.slice(0, source.path.lastIndexOf("/") + 1)
      : ""
    const root = `${base}/${source.owner}/${source.repo}/${base.includes("raw.") ? "" : "blob/"}${source.ref}/`
    return new URL(href.startsWith("/") ? href.slice(1) : href, new URL(dir, root))
  } catch {
    return null
  }
}

function textOf(node: ElementContent): string {
  if (node.type === "text") return node.value
  if (node.type === "element") return node.children.map(textOf).join("")
  return ""
}

/** True when an element holds nothing a reader would see (whitespace, <br>s, empty wrappers). */
function isEmpty(node: Element): boolean {
  return node.children.every((child) =>
    child.type === "text"
      ? child.value.trim() === ""
      : child.type === "element"
        ? child.tagName === "br" || (child.tagName !== "img" && isEmpty(child))
        : true,
  )
}

const HEADINGS = ["h1", "h2", "h3", "h4", "h5", "h6"]

function adapt(tree: Root, source: ReadmeSource) {
  const slugger = new GithubSlugger()

  // The first H1, if it comes before any other content, is the project's name.
  const firstElement = tree.children.find(
    (n): n is Element => n.type === "element" && !(n.tagName === "p" && isEmpty(n)),
  )
  if (firstElement?.tagName === "h1") tree.children.splice(tree.children.indexOf(firstElement), 1)

  visit(tree, "element", (node) => {
    const props = node.properties
    delete props.align
    delete props.id

    if (HEADINGS.includes(node.tagName)) {
      const level = Math.min(Number(node.tagName[1]) + 1, 6)
      node.tagName = `h${level}`
      props.id = `readme-${slugger.slug(textOf(node))}`
    }

    if (node.tagName === "a" && typeof props.href === "string") {
      const href = props.href
      if (href.startsWith("#")) {
        props.href = `#readme-${href.slice(1).replace(/^user-content-/, "")}`
      } else {
        const url = /^[a-z][a-z0-9+.-]*:/i.test(href)
          ? safeUrl(href)
          : resolve(href, "https://github.com", source)
        if (!url || !["http:", "https:", "mailto:"].includes(url.protocol)) delete props.href
        else {
          props.href = url.href
          if (url.protocol !== "mailto:") {
            props.target = "_blank"
            props.rel = ["noopener", "noreferrer"]
          }
        }
      }
    }

    if (node.tagName === "img" || node.tagName === "source") {
      const attr = node.tagName === "img" ? "src" : "srcSet"
      const raw = typeof props[attr] === "string" ? (props[attr] as string) : ""
      const url = /^https?:/i.test(raw)
        ? safeUrl(raw)
        : resolve(raw, "https://raw.githubusercontent.com", source)
      // github.com/<o>/<r>/blob/<ref>/<file> images are pages, not files: use the raw file.
      const blob =
        url?.hostname === "github.com" && url.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/(.+)$/)
      const final = blob
        ? new URL(`https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${blob[3]}`)
        : url
      if (
        !final ||
        final.protocol !== "https:" ||
        isBadge(final) ||
        !isAllowedImageHost(final.hostname)
      ) {
        props[attr] = undefined
        props.dataDrop = true
      } else {
        props[attr] = final.href
        if (node.tagName === "img") props.loading = "lazy"
      }
    }
  })

  // Drop rejected images, then anything they leave empty (links, paragraphs, <picture>).
  visit(tree, "element", (node, index, parent) => {
    if (!parent || index === undefined) return
    if (node.properties.dataDrop) {
      parent.children.splice(index, 1)
      return [SKIP, index]
    }
  })
  let removed = true
  while (removed) {
    removed = false
    visit(tree, "element", (node, index, parent) => {
      if (!parent || index === undefined) return
      if (["a", "p", "picture", "div"].includes(node.tagName) && isEmpty(node) && !hasImage(node)) {
        parent.children.splice(index, 1)
        removed = true
        return [SKIP, index]
      }
    })
  }
}

function hasImage(node: Element): boolean {
  return node.children.some((c) => c.type === "element" && (c.tagName === "img" || hasImage(c)))
}

function safeUrl(href: string): URL | null {
  try {
    return new URL(href)
  } catch {
    return null
  }
}

/** Sanitized, adapted HTML tree for a README. */
export function readmeTree(markdown: string, source: ReadmeSource): Root {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, {
      ...defaultSchema,
      // No "user-content-" clobbering: ids are dropped and rebuilt as "readme-…" in adapt().
      clobber: [],
      clobberPrefix: "",
    })
  const tree = processor.runSync(processor.parse(markdown)) as Root
  adapt(tree, source)
  return tree
}
