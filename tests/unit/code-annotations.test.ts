import { describe, expect, it } from "vitest"

import { convertCodeAnnotations } from "@/sanity/migrations/code-annotations"

const para = (key: string, text: string) => ({
  _key: key,
  _type: "block",
  style: "normal",
  markDefs: [],
  children: [{ _key: `${key}s`, _type: "span", text, marks: [] }],
})

describe("convertCodeAnnotations", () => {
  it("replaces a paragraph that only anchors a snippet with a code block", () => {
    const body = [
      para("a", "Intro"),
      {
        _key: "b",
        _type: "block",
        style: "normal",
        markDefs: [
          { _key: "m1", _type: "code", code: "ollama run llama3", language: null, filename: null },
        ],
        children: [{ _key: "s1", _type: "span", text: " ", marks: ["m1"] }],
      },
      para("c", "Outro"),
    ]
    const { body: out, converted } = convertCodeAnnotations(body)
    expect(converted).toBe(1)
    expect(out).toEqual([body[0], { _key: "b", _type: "code", code: "ollama run llama3" }, body[2]])
  })

  it("keeps language, filename and highlighted lines", () => {
    const { body } = convertCodeAnnotations([
      {
        _key: "b",
        _type: "block",
        markDefs: [
          {
            _key: "m1",
            _type: "code",
            code: "new Vue({})",
            language: "javascript",
            filename: "File.js",
            highlightedLines: [1],
          },
        ],
        children: [{ _key: "s1", _type: "span", text: "new Vue({})", marks: ["m1"] }],
      },
    ])
    expect(body).toEqual([
      {
        _key: "b",
        _type: "code",
        code: "new Vue({})",
        language: "javascript",
        filename: "File.js",
        highlightedLines: [1],
      },
    ])
  })

  it("keeps surrounding text (with its links) as paragraphs around the snippet", () => {
    const { body } = convertCodeAnnotations([
      {
        _key: "b",
        _type: "block",
        style: "normal",
        markDefs: [
          { _key: "l1", _type: "link", href: "/x" },
          { _key: "m1", _type: "code", code: "npm i" },
        ],
        children: [
          { _key: "s1", _type: "span", text: "Run ", marks: ["l1"] },
          { _key: "s2", _type: "span", text: "npm", marks: ["m1"] },
          { _key: "s3", _type: "span", text: " i", marks: ["m1", "strong"] },
          { _key: "s4", _type: "span", text: " then go.", marks: [] },
        ],
      },
    ])
    expect(body).toEqual([
      {
        _key: "b",
        _type: "block",
        style: "normal",
        markDefs: [{ _key: "l1", _type: "link", href: "/x" }],
        children: [{ _key: "s1", _type: "span", text: "Run ", marks: ["l1"] }],
      },
      { _key: "b-1", _type: "code", code: "npm i" },
      {
        _key: "b-2",
        _type: "block",
        style: "normal",
        markDefs: [],
        children: [{ _key: "s4", _type: "span", text: " then go.", marks: [] }],
      },
    ])
  })

  it("leaves documents without code annotations untouched", () => {
    const body = [para("a", "Hello"), { _key: "i", _type: "image" }]
    expect(convertCodeAnnotations(body)).toEqual({ body, converted: 0, skippedListItems: [] })
  })

  it("leaves a list item with text around its snippet for manual conversion", () => {
    const item = {
      _key: "li",
      _type: "block",
      style: "normal",
      listItem: "bullet",
      level: 1,
      markDefs: [{ _key: "m1", _type: "code", code: "npm i" }],
      children: [
        { _key: "s1", _type: "span", text: "Run ", marks: [] },
        { _key: "s2", _type: "span", text: "npm i", marks: ["m1"] },
        { _key: "s3", _type: "span", text: " first", marks: [] },
      ],
    }
    expect(convertCodeAnnotations([item])).toEqual({
      body: [item],
      converted: 0,
      skippedListItems: ["li"],
    })
  })
})
