import { describe, expect, it } from "vitest"
import {
  POST_SOURCE_PROJECTION,
  bodyToMarkdown,
  markdownDigest,
  postToMarkdown,
  sanityImageUrl,
  signatureFor,
} from "@/lib/post-markdown"
import { POST_SOURCE_QUERY, POST_SOURCES_QUERY } from "@/sanity/lib/queries"

const project = { projectId: "abc123", dataset: "production" }

let key = 0
const span = (text: string, marks: string[] = []) => ({
  _type: "span",
  _key: `s${key++}`,
  text,
  marks,
})
const block = (children: ReturnType<typeof span>[], extra: Record<string, unknown> = {}) => ({
  _type: "block",
  _key: `b${key++}`,
  style: "normal",
  markDefs: [] as { _key: string; _type: string; href?: string }[],
  children,
  ...extra,
})
const md = (blocks: object[]) => bodyToMarkdown(blocks as never, project)

describe("postToMarkdown", () => {
  const post = {
    title: 'Fixing "the" NAS',
    slug: "fixing-the-nas",
    publishedAt: "2026-03-04T10:00:00Z",
    author: "Ashik Eqbal",
    excerpt: null,
    body: [block([span("It broke.")])],
  }

  // The exact bytes signatures cover: if this changes, every post needs re-signing.
  it("renders front matter, the title and the body, ending in one newline", () => {
    expect(postToMarkdown(post, project)).toBe(
      [
        "---",
        'title: "Fixing \\"the\\" NAS"',
        'author: "Ashik Eqbal"',
        "published: 2026-03-04",
        "canonical: https://www.itsashik.dev/post/fixing-the-nas",
        "---",
        "",
        '# Fixing "the" NAS',
        "",
        "It broke.",
        "",
      ].join("\n"),
    )
  })

  it("adds the post's own excerpt as the description, and copes with missing fields", () => {
    expect(postToMarkdown({ ...post, excerpt: " Short. " }, project)).toContain(
      'description: "Short."\n---',
    )
    expect(
      postToMarkdown(
        { title: null, slug: null, publishedAt: null, author: null, excerpt: null, body: null },
        project,
      ),
    ).toBe('---\ntitle: "Untitled"\nauthor: "Ashik Eqbal"\n---\n\n# Untitled\n')
  })

  it("hashes the UTF-8 bytes", () => {
    expect(markdownDigest("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    )
    // "é" is two bytes in UTF-8, so it can't hash like a one-byte character.
    expect(markdownDigest("é")).not.toBe(markdownDigest("\u00e9".normalize("NFD")))
  })
})

describe("bodyToMarkdown: inline marks", () => {
  it("nests marks that overlap instead of reopening them per span", () => {
    expect(
      md([block([span("a ", ["strong"]), span("b", ["strong", "em"]), span(" c", ["strong"])])]),
    ).toBe("**a _b_ c**")
  })

  it("keeps spaces outside the delimiters", () => {
    expect(md([block([span("plain "), span("bold ", ["strong"]), span("after")])])).toBe(
      "plain **bold** after",
    )
  })

  it("renders code without escaping, and links with absolute targets", () => {
    const b = block([span("run "), span("a_b*c", ["code"]), span(" see "), span("docs", ["l1"])])
    b.markDefs = [{ _key: "l1", _type: "link", href: "/post/x (2)" }]
    expect(md([b])).toBe("run `a_b*c` see [docs](https://www.itsashik.dev/post/x%20%282%29)")
  })

  it("supports strike-through, and escapes Markdown syntax in plain text", () => {
    expect(md([block([span("gone", ["strike-through"])])])).toBe("~~gone~~")
    expect(md([block([span("2*3 [x] <b> _init_ snake_case `t`")])])).toBe(
      "2\\*3 \\[x\\] \\<b> \\_init\\_ snake_case \\`t\\`",
    )
  })

  it("escapes a line start Markdown would read as a block", () => {
    expect(md([block([span("# not a heading")])])).toBe("\\# not a heading")
    expect(md([block([span("1. not a list")])])).toBe("1\\. not a list")
    expect(md([block([span("- nor this")])])).toBe("\\- nor this")
  })

  it("turns line breaks into hard breaks", () => {
    expect(md([block([span("one\ntwo")])])).toBe("one\\\ntwo")
  })
})

describe("bodyToMarkdown: blocks", () => {
  it("renders headings and quotes, and skips empty blocks", () => {
    expect(
      md([
        block([span("Setup")], { style: "h2" }),
        block([span("")]),
        block([span("Details")], { style: "h3" }),
        block([span("quoted\nlines")], { style: "blockquote" }),
      ]),
    ).toBe("## Setup\n\n### Details\n\n> quoted\\\n> lines")
  })

  it("renders nested lists, numbering each list from 1", () => {
    const item = (text: string, listItem: string, level = 1) =>
      block([span(text)], { listItem, level })
    expect(
      md([
        item("one", "number"),
        item("two", "number"),
        item("sub", "bullet", 2),
        item("subsub", "number", 3),
        item("three", "number"),
        block([span("between")]),
        item("again", "number"),
      ]),
    ).toBe(
      [
        "1. one",
        "2. two",
        "    - sub",
        "        1. subsub",
        "3. three",
        "",
        "between",
        "",
        "1. again",
      ].join("\n"),
    )
  })

  it("fences code longer than any backtick run inside, with language and filename", () => {
    expect(
      md([{ _type: "code", _key: "c", language: "sh", filename: "a.sh", code: "echo ```\n\n" }]),
    ).toBe('````sh title="a.sh"\necho ```\n````')
    expect(md([{ _type: "code", _key: "c", code: "x" }])).toBe("```\nx\n```")
  })

  it("renders callouts as GitHub alerts", () => {
    expect(
      md([
        {
          _type: "callout",
          _key: "k",
          tone: "warning",
          title: "Careful",
          text: "It *will* wipe\nthe disk.",
        },
      ]),
    ).toBe("> [!WARNING]\n> **Careful**\n> It \\*will\\* wipe\\\n> the disk.")
  })

  it("renders images from the CDN, and videos as links", () => {
    expect(
      md([
        {
          _type: "image",
          _key: "i",
          alt: "rack",
          caption: "The rack",
          asset: { _ref: "image-abc123-800x600-png" },
        },
        { _type: "video", _key: "v", title: "Boot", youtubeUrl: "https://youtu.be/dQw4w9WgXcQ" },
        { _type: "image", _key: "broken", asset: { _ref: "nope" } },
      ]),
    ).toBe(
      "![rack](https://cdn.sanity.io/images/abc123/production/abc123-800x600.png)\n*The rack*\n\n[Video: Boot](https://www.youtube.com/watch?v=dQw4w9WgXcQ)",
    )
  })
})

describe("sanityImageUrl", () => {
  it("builds the original's URL and rejects malformed references", () => {
    expect(sanityImageUrl("image-ff00-10x20-jpg", project)).toBe(
      "https://cdn.sanity.io/images/abc123/production/ff00-10x20.jpg",
    )
    expect(sanityImageUrl("file-ff00-mp4", project)).toBeNull()
    expect(sanityImageUrl(undefined, project)).toBeNull()
  })
})

describe("POST_SOURCE_QUERY", () => {
  // scripts/sign-posts.ts signs from POST_SOURCE_PROJECTION; the site renders from this query.
  it("projects exactly POST_SOURCE_PROJECTION's fields", () => {
    const squash = (s: string) => s.replace(/\s+/g, " ").trim()
    expect(squash(POST_SOURCE_QUERY)).toContain(squash(POST_SOURCE_PROJECTION))
    expect(squash(POST_SOURCES_QUERY)).toContain(squash(POST_SOURCE_PROJECTION))
  })
})

describe("signatureFor", () => {
  const markdown = "# Post\n"
  const stored = {
    sha256: markdownDigest(markdown),
    signature: "-----BEGIN PGP SIGNATURE-----",
    fingerprint: "AAAA",
    signedAt: "2026-11-17T00:00:00Z",
  }

  it("serves a signature over these exact bytes, by the site's key", () => {
    expect(signatureFor(markdown, stored, "AAAA")).toEqual({
      armored: stored.signature,
      signedAt: stored.signedAt,
    })
  })

  it("serves none after an edit, from another key, or before signing", () => {
    expect(signatureFor("# Post, edited\n", stored, "AAAA")).toBeNull()
    expect(signatureFor(markdown, stored, "BBBB")).toBeNull()
    expect(signatureFor(markdown, { ...stored, signature: null }, "AAAA")).toBeNull()
    expect(signatureFor(markdown, null, "AAAA")).toBeNull()
  })
})
