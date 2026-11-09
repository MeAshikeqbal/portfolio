import { describe, expect, it } from "vitest"
import { buildToc, readingTime, slugify, toPlainText } from "@/lib/portable-text"

const block = (style: string, text: string, key = text) => ({
  _type: "block",
  _key: key,
  style,
  children: [{ _type: "span", text }],
})

describe("portable text helpers", () => {
  it("extracts plain text from text blocks only", () => {
    expect(toPlainText([block("normal", "Hello"), { _type: "image" }, block("h2", "World")])).toBe(
      "Hello\nWorld",
    )
  })

  it("estimates reading time at ~220 wpm with a 1-minute floor", () => {
    expect(readingTime([block("normal", "short")])).toBe(1)
    expect(readingTime([block("normal", Array(660).fill("word").join(" "))])).toBe(3)
    expect(readingTime(null)).toBe(1)
  })

  it("slugifies headings", () => {
    expect(slugify("Why I Started Self-Hosting AI at Home")).toBe(
      "why-i-started-self-hosting-ai-at-home",
    )
    expect(slugify("Café & Crème!")).toBe("cafe-creme")
    expect(slugify("!!!")).toBe("section")
  })

  it("builds a TOC from h2/h3 with unique ids keyed by block", () => {
    const { entries, idsByKey } = buildToc([
      block("h2", "Setup", "a"),
      block("normal", "text", "b"),
      block("h3", "Hardware", "c"),
      block("h2", "Setup", "d"),
      block("h4", "Ignored", "e"),
    ])
    expect(entries).toEqual([
      { id: "setup", text: "Setup", level: 2 },
      { id: "hardware", text: "Hardware", level: 3 },
      { id: "setup-2", text: "Setup", level: 2 },
    ])
    expect(idsByKey.get("d")).toBe("setup-2")
  })
})
