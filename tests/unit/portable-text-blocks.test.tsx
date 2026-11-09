import { PortableText } from "@portabletext/react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { portableTextComponents } from "@/components/portable-text/components"

const renderBody = (value: unknown[]) =>
  render(<PortableText value={value as never} components={portableTextComponents} />)

describe("portable text blocks", () => {
  it("renders a warning callout with its default label", () => {
    renderBody([{ _type: "callout", _key: "c", tone: "warning", text: "Back up first." }])
    const callout = screen.getByRole("complementary")
    expect(callout).toHaveTextContent("Warning")
    expect(callout).toHaveTextContent("Back up first.")
    // A tinted panel with a hairline all round: no coloured side stripe.
    expect(callout.className).toContain("bg-status-warn-soft")
    expect(callout.className).not.toMatch(/border-[lr]-/)
  })

  it("keeps the tone audible when a callout has its own title", () => {
    renderBody([{ _type: "callout", _key: "w", tone: "warning", title: "Careful", text: "x" }])
    expect(screen.getByRole("complementary")).toHaveTextContent("Careful")
    expect(screen.getByText("Warning")).toHaveClass("sr-only")
  })

  it("uses a callout's own title and skips empty callouts", () => {
    const { container } = renderBody([
      { _type: "callout", _key: "a", tone: "note", title: "Heads up", text: "Hi" },
      { _type: "callout", _key: "b", tone: "note" },
    ])
    expect(screen.getAllByRole("complementary")).toHaveLength(1)
    expect(container).toHaveTextContent("Heads up")
  })

  it("captions images with the caption, not the alt text", () => {
    renderBody([
      {
        _type: "image",
        _key: "i",
        alt: "A rack of servers",
        caption: "The homelab, 2026",
        asset: { _ref: "image-abc123-800x600-png", _type: "reference" },
      },
    ])
    expect(screen.getByRole("img", { name: "A rack of servers" })).toBeInTheDocument()
    expect(screen.getByText("The homelab, 2026").tagName).toBe("FIGCAPTION")
  })

  it("renders inline code and strike-through decorators", () => {
    const { container } = renderBody([
      {
        _type: "block",
        _key: "p",
        style: "normal",
        markDefs: [],
        children: [
          { _type: "span", _key: "a", text: "npm i", marks: ["code"] },
          { _type: "span", _key: "b", text: "old", marks: ["strike-through"] },
        ],
      },
    ])
    expect(container.querySelector("p code")).toHaveTextContent("npm i")
    expect(container.querySelector("del")).toHaveTextContent("old")
  })
})
