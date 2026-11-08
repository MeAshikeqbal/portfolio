import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SkillIcon, iconifyUrl } from "@/components/skill-icon"

describe("iconifyUrl", () => {
  it("builds a CDN URL from an Iconify name", () => {
    expect(iconifyUrl("logos:aws")).toBe("https://api.iconify.design/logos/aws.svg")
  })

  it.each(["", "aws", "logos:", "logos:aws/../x", "javascript:alert(1)"])(
    "rejects malformed name %j",
    (name) => {
      expect(iconifyUrl(name)).toBeNull()
    },
  )
})

describe("SkillIcon", () => {
  it("renders multicolour sets as an <img>", () => {
    render(<SkillIcon name="logos:aws" label="AWS" />)
    expect(screen.getByRole("img", { name: "AWS" }).tagName).toBe("IMG")
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
