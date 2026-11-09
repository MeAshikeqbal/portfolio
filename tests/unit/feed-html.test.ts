import { describe, expect, it, vi } from "vitest"

vi.mock("@/sanity/lib/image", () => ({
  urlFor: () => ({
    width: () => ({ fit: () => ({ auto: () => ({ url: () => "https://cdn.sanity.io/x.png" }) }) }),
  }),
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
