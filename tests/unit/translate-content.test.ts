import { describe, expect, it, vi } from "vitest"
import { derivedExcerpt, segmentsOf, translatedContent } from "@/lib/translate/content"
import {
  deleteTranslations,
  translateDocument,
  type TranslationClient,
} from "@/lib/translate/document"
import { blockHtml, translatedBlock, type TextBlock } from "@/lib/translate/portable-text"

const span = (key: string, text: string, marks: string[] = []) => ({
  _type: "span" as const,
  _key: key,
  text,
  marks,
})
const block = (key: string, ...children: ReturnType<typeof span>[]): TextBlock => ({
  _type: "block",
  _key: key,
  style: "normal",
  markDefs: [{ _key: "l1", _type: "link", href: "https://example.com" }],
  children,
})

/** Google stand-in: upper-cases text outside translate="no", keeps the markup. */
function shout(html: string): string {
  let keep = 0
  return html
    .split(/(<[^>]+>)/)
    .map((part) => {
      if (part.startsWith("<")) {
        if (/translate="no"/.test(part)) keep++
        else if (/^<\/(a|span)>$/.test(part) && keep > 0) keep--
        return part
      }
      return keep > 0 ? part : part.toUpperCase()
    })
    .join("")
}

describe("Portable Text blocks", () => {
  const source = block(
    "b1",
    span("s1", "Run "),
    span("s2", "docker ps", ["code"]),
    span("s3", " on the Proxmox host, then read ", []),
    span("s4", "the docs", ["l1"]),
    span("s5", "."),
  )

  it("tags every span by key and protects code and names", () => {
    const html = blockHtml(source)!
    expect(html).toContain('<a data-k="s2" translate="no">docker ps</a>')
    expect(html).toContain('<span translate="no">Proxmox</span>')
  })

  it("rebuilds the spans with their keys and marks, in the translated text", () => {
    const out = translatedBlock(source, shout(blockHtml(source)!))
    expect(out.children).toEqual([
      span("s1", "RUN "),
      span("s2", "docker ps", ["code"]),
      span("s3", " ON THE Proxmox HOST, THEN READ "),
      span("s4", "THE DOCS", ["l1"]),
      span("s5", "."),
    ])
    expect(out.markDefs).toEqual(source.markDefs)
  })

  it("follows spans Google reorders, and keeps text Google moves outside them", () => {
    const out = translatedBlock(
      source,
      '<a data-k="s4">die Doku</a> lesen, <a data-k="s1">dann</a><a data-k="s2">docker ps</a>',
    )
    expect(out.children!.map((c) => (c as { text: string }).text)).toEqual([
      "die Doku lesen, ",
      "dann",
      "docker ps",
    ])
    expect(out.children!.map((c) => c._key)).toEqual(["s4", "s1", "s2"])
  })

  it("gives a span Google split in two a key of its own", () => {
    const out = translatedBlock(source, '<a data-k="s1">a</a> b <a data-k="s1">c</a>')
    expect(out.children!.map((c) => c._key)).toEqual(["s1", "s1-1"])
  })

  it("keeps the text when Google drops every tag", () => {
    expect(translatedBlock(source, "nur Text").children).toEqual([span("s1", "nur Text")])
  })

  it("skips blocks with nothing to translate", () => {
    expect(blockHtml(block("b2", span("s", "npm i", ["code"])))).toBeNull()
    expect(blockHtml(block("b3", span("s", "  ")))).toBeNull()
  })
})

const post = {
  _id: "post-1",
  _type: "post",
  _rev: "r1",
  title: "My homelab",
  slug: { current: "my-homelab" },
  mainImage: { _type: "image", asset: { _ref: "image-1" }, alt: "A rack" },
  body: [
    block("b1", span("s1", "First paragraph.")),
    { _type: "code", _key: "c1", code: "echo hi", language: "sh" },
    { _type: "callout", _key: "n1", tone: "note", title: "Heads up", text: "Back up first." },
  ],
  seo: { title: "SEO title", noIndex: false },
}

describe("translated content", () => {
  it("lists every piece of text once", () => {
    const segments = segmentsOf(post)
    expect(segments).toContain(
      "My homelab".replace("homelab", '<span translate="no">homelab</span>'),
    )
    expect(segments).toContain("Heads up")
    expect(segments.some((s) => s.includes("echo hi"))).toBe(false)
  })

  it("swaps only text and keeps the document's shape", () => {
    const content = translatedContent(post, new Map(segmentsOf(post).map((s) => [s, shout(s)])))
    expect(content.title).toBe("MY homelab")
    expect(content.mainImage).toEqual({ ...post.mainImage, alt: "A RACK" })
    // No explicit excerpt: the translation carries the derived one.
    expect(content.excerpt).toBe("FIRST PARAGRAPH.")
    const body = content.body as Record<string, unknown>[]
    expect(body[1]).toEqual(post.body[1])
    expect(body[2]).toMatchObject({
      _key: "n1",
      tone: "note",
      title: "HEADS UP",
      text: "BACK UP FIRST.",
    })
    expect(content.seo).toEqual({ title: "SEO TITLE", noIndex: false })
    expect(content).not.toHaveProperty("slug")
  })

  it("never translates homelab machine names", () => {
    const uses = {
      _type: "uses",
      intro: "My lab.",
      sections: [
        {
          _key: "h",
          title: "Homelab",
          items: [{ _key: "t", name: "Tower", description: "Media box" }],
        },
      ],
    }
    const content = translatedContent(uses, new Map(segmentsOf(uses).map((s) => [s, shout(s)])))
    expect(content.sections).toEqual([
      {
        _key: "h",
        title: "Homelab",
        items: [{ _key: "t", name: "Tower", description: "MEDIA BOX" }],
      },
    ])
  })

  it("derives the excerpt the way the queries do", () => {
    expect(derivedExcerpt([block("b", span("s", "x".repeat(300)))])).toHaveLength(200)
    expect(derivedExcerpt([])).toBeUndefined()
  })
})

/** An in-memory Sanity client: documents by id, translations written by transactions. */
function fakeClient(docs: Record<string, Record<string, unknown>>) {
  const written: Record<string, unknown>[] = []
  const client: TranslationClient = {
    getDocument: async (id) => docs[id] as never,
    fetch: async (query: string, params?: Record<string, unknown>) => {
      if (query.includes("source._ref == $id") && query.includes("memory")) {
        return Object.values(docs).filter(
          (d) => d._type === "translation" && (d.source as { _ref: string })._ref === params!.id,
        ) as never
      }
      if (query.includes("._rev")) return (docs[params!.id as string]?._rev ?? null) as never
      throw new Error(`unexpected query ${query}`)
    },
    transaction: () => {
      const batch: Record<string, unknown>[] = []
      return {
        createOrReplace: (doc) => batch.push(doc),
        commit: async () => {
          for (const doc of batch) docs[doc._id as string] = doc
          written.push(...batch)
        },
      }
    },
    delete: vi.fn(async () => {}),
  }
  return { client, written }
}

function fakeGoogle() {
  return vi.fn(async (_url: string, init?: RequestInit) => {
    const { q } = JSON.parse(init!.body as string)
    return Response.json({
      data: { translations: q.map((s: string) => ({ translatedText: shout(s) })) },
    })
  })
}

describe("translateDocument", () => {
  const options = (client: TranslationClient, google: ReturnType<typeof fakeGoogle>) => ({
    client,
    apiKey: "k",
    locales: ["de", "ja"] as const,
    fetch: google as unknown as typeof fetch,
    now: () => new Date("2026-11-16T00:00:00Z"),
  })

  it("writes one translation per language, linked to the source and its revision", async () => {
    const { client, written } = fakeClient({ "post-1": structuredClone(post) })
    const google = fakeGoogle()
    const result = await translateDocument("post-1", options(client, google))
    expect(result).toMatchObject({ status: "done", type: "post" })
    expect(written.map((d) => d._id)).toEqual(["translation-de-post-1", "translation-ja-post-1"])
    expect(written[0]).toMatchObject({
      _type: "translation",
      language: "de",
      source: { _ref: "post-1", _weak: true },
      sourceRev: "r1",
      content: { title: "MY homelab" },
    })
  })

  it("re-sends only text that changed", async () => {
    const docs: Record<string, Record<string, unknown>> = { "post-1": structuredClone(post) }
    const { client } = fakeClient(docs)
    const google = fakeGoogle()
    await translateDocument("post-1", options(client, google))
    google.mockClear()

    docs["post-1"] = { ...docs["post-1"], _rev: "r2", title: "My new homelab" }
    await translateDocument("post-1", options(client, google))
    const sent = google.mock.calls.flatMap(([, init]) => JSON.parse(init!.body as string).q)
    expect(sent).toEqual([
      'My new <span translate="no">homelab</span>',
      'My new <span translate="no">homelab</span>',
    ])
  })

  it("does nothing for an unchanged revision", async () => {
    const { client } = fakeClient({ "post-1": structuredClone(post) })
    const google = fakeGoogle()
    await translateDocument("post-1", options(client, google))
    google.mockClear()
    const result = await translateDocument("post-1", options(client, google))
    expect(google).not.toHaveBeenCalled()
    expect(result).toMatchObject({ locales: [{ status: "unchanged" }, { status: "unchanged" }] })
  })

  it("leaves a hand-edited translation alone", async () => {
    const { client, written } = fakeClient({
      "post-1": structuredClone(post),
      "translation-de-post-1": {
        _id: "translation-de-post-1",
        _type: "translation",
        language: "de",
        manual: true,
        source: { _ref: "post-1" },
      },
    })
    await translateDocument("post-1", options(client, fakeGoogle()))
    expect(written.map((d) => d._id)).toEqual(["translation-ja-post-1"])
  })

  it("writes nothing if the source changed while translating", async () => {
    const docs: Record<string, Record<string, unknown>> = { "post-1": structuredClone(post) }
    const { client, written } = fakeClient(docs)
    const google = vi.fn(async (url: string, init?: RequestInit) => {
      docs["post-1"] = { ...docs["post-1"], _rev: "r9" }
      return fakeGoogle()(url, init)
    })
    const result = await translateDocument("post-1", options(client, google))
    expect(result).toMatchObject({ status: "aborted", reason: "changed while translating" })
    expect(written).toEqual([])
  })

  it("refuses documents over the character cap", async () => {
    const { client, written } = fakeClient({ "post-1": structuredClone(post) })
    const result = await translateDocument("post-1", {
      ...options(client, fakeGoogle()),
      maxChars: 10,
    })
    expect(result).toMatchObject({ status: "aborted" })
    expect(written).toEqual([])
  })

  it("skips drafts and types it doesn't translate", async () => {
    const { client } = fakeClient({ cv: { _id: "cv", _type: "cv", _rev: "r" } })
    expect(await translateDocument("drafts.post-1", options(client, fakeGoogle()))).toMatchObject({
      status: "skipped",
    })
    expect(await translateDocument("cv", options(client, fakeGoogle()))).toMatchObject({
      status: "skipped",
    })
  })

  it("deletes every translation of a removed document", async () => {
    const { client } = fakeClient({})
    await deleteTranslations("post-1", client)
    expect(client.delete).toHaveBeenCalledWith({
      query: '*[_type == "translation" && source._ref == $id]',
      params: { id: "post-1" },
    })
  })
})

describe("archived posts", () => {
  it("aren't translated", async () => {
    const { client, written } = fakeClient({
      "post-1": { ...structuredClone(post), archived: true },
    })
    const result = await translateDocument("post-1", {
      client,
      apiKey: "k",
      locales: ["de"],
      fetch: fakeGoogle() as unknown as typeof fetch,
    })
    expect(result).toMatchObject({ status: "skipped", reason: "archived" })
    expect(written).toEqual([])
  })
})
