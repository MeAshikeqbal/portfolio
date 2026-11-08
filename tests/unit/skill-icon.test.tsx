import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SkillIcon } from "@/components/skill-icon"
import { iconUrl, renderIconSvg } from "@/lib/icons"

describe("iconUrl", () => {
  it("maps an Iconify name to the same-origin icon route", () => {
    expect(iconUrl("logos:aws")).toBe("/icons/logos/aws.svg")
  })

  it.each(["", "aws", "logos:", "logos:aws/../x", "javascript:alert(1)"])("rejects malformed name %j", (name) => {
    expect(iconUrl(name)).toBeNull()
  })
})

describe("renderIconSvg", () => {
  it("renders a bundled icon as standalone SVG", async () => {
    const svg = await renderIconSvg("mdi", "security")
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/)
    expect(svg).toContain('fill="currentColor"')
  })

  it("returns null for unknown sets, unknown icons and path tricks", async () => {
    expect(await renderIconSvg("nope", "x")).toBeNull()
    expect(await renderIconSvg("logos", "does-not-exist")).toBeNull()
    expect(await renderIconSvg("logos", "../package")).toBeNull()
  })
})

describe("SkillIcon", () => {
  it("renders multicolour sets as an <img>", () => {
    render(<SkillIcon name="logos:aws" label="AWS" />)
    const icon = screen.getByRole("img", { name: "AWS" })
    expect(icon.tagName).toBe("IMG")
    expect(icon).toHaveAttribute("src", "/icons/logos/aws.svg")
  })

  it("renders monochrome sets as a masked element that follows currentColor", () => {
    render(<SkillIcon name="mdi:security" label="Security" />)
    const icon = screen.getByRole("img", { name: "Security" })
    expect(icon.tagName).toBe("SPAN")
    expect(icon).toHaveClass("bg-current")
  })

  it("renders nothing for a malformed name", () => {
    const { container } = render(<SkillIcon name="bad" label="Bad" />)
    expect(container).toBeEmptyDOMElement()
  })
})
