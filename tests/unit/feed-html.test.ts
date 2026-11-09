import { describe, expect, it, vi } from "vitest"

vi.mock("@/sanity/lib/image", () => ({
  urlFor: (value: { asset?: { _ref?: string } }) => {
    // Like the real builder, a malformed reference throws.
    if (value?.asset?._ref === "not-a-valid-ref") throw new Error("Malformed asset _ref")
    return {
      width: () => ({
        fit: () => ({ auto: () => ({ url: () => "https://cdn.sanity.io/x.png" }) }),
      }),
    }
  },
}))

const { portableTextToFeedHtml } = await import("@/lib/feed-html")

describe("portableTextToFeedHtml", () => {
  it("renders text, code, callouts and images as plain HTML", () => {
    const body = [
      {
        _type: "block",
        _key: "a",
        style: "normal",
        markDefs: [],
        children: [{ _type: "span", _key: "s", text: "Hello <world>", marks: [] }],
      },
      { _type: "code", _key: "b", code: "echo 1 && echo 2", filename: "run.sh" },
      { _type: "callout", _key: "c", tone: "warning", text: "Back up first" },
      { _type: "image", _key: "d", asset: { _ref: "image-abc-10x10-png" }, alt: "Rack" },
    ]
    const html = portableTextToFeedHtml(body)
    expect(html).toContain("<p>Hello &lt;world&gt;</p>")
    expect(html).toContain(
      "<figcaption>run.sh</figcaption><pre><code>echo 1 &amp;&amp; echo 2</code></pre>",
    )
    expect(html).toContain("<strong>Warning</strong>")
    expect(html).toContain('<img src="https://cdn.sanity.io/x.png" alt="Rack"/>')
    expect(html).not.toContain("class=")
  })

  it("returns an empty string for an empty body", () => {
    expect(portableTextToFeedHtml([])).toBe("")
    expect(portableTextToFeedHtml(null)).toBe("")
  })
})

describe("feed images with broken references", () => {
  it("skips a malformed asset reference instead of throwing", () => {
    const html = portableTextToFeedHtml([
      { _type: "image", _key: "bad", asset: { _ref: "not-a-valid-ref" }, alt: "x" },
      {
        _type: "block",
        _key: "ok",
        style: "normal",
        markDefs: [],
        children: [{ _type: "span", _key: "s", text: "Still here.", marks: [] }],
      },
    ] as never)
    expect(html).not.toContain("<img")
    expect(html).toContain("Still here.")
  })
})
