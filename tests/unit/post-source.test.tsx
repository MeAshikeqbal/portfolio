import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PostSource } from "@/components/blog/post-source"

describe("PostSource", () => {
  it("links the Markdown copy, without signature or commands while unsigned", () => {
    render(<PostSource slug="nas" signedAt={false} />)
    expect(screen.getByRole("link", { name: /Markdown/ })).toHaveAttribute("href", "/post/nas.md")
    expect(screen.queryByRole("link", { name: /Signature/ })).toBeNull()
    expect(screen.queryByText("pgp-signed")).toBeNull()
    expect(screen.queryByRole("region", { name: /verify/i })).toBeNull()
  })

  it("once signed, names the key and date and shows how to check it", () => {
    render(<PostSource slug="nas" signedAt="2026-11-17T08:00:00Z" />)
    expect(screen.getByText("pgp-signed")).toBeInTheDocument()
    expect(screen.getByText(/FA0D 3AE3 EB0E 3762 on Nov 17, 2026/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Signature/ })).toHaveAttribute(
      "href",
      "/post/nas.md.asc",
    )
    const commands = screen.getByRole("region", { name: /verify/i }).textContent
    expect(commands).toContain(
      "curl -s -O https://itsashik.dev/post/nas.md -O https://itsashik.dev/post/nas.md.asc",
    )
    expect(commands).toContain("gpg --verify nas.md.asc nas.md")
  })
})
