import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SiteFooter } from "@/components/site/site-footer"
import { identityLines } from "@/lib/identity"
import { siteConfig } from "@/lib/site"

describe("SiteFooter", () => {
  it("shows the signed statement's links, each pointing where it says", () => {
    render(<SiteFooter />)
    for (const { value } of identityLines()) {
      const link = screen.getAllByRole("link").find((a) => a.getAttribute("href") === value)
      expect(link, value).toBeDefined()
    }
  })

  it("shows the signing key's fingerprint, validity and how to verify", () => {
    render(<SiteFooter />)
    const fingerprint = siteConfig.pgpFingerprint.match(/.{4}/g)!
    for (const group of fingerprint) expect(screen.getAllByText(group).length).toBeGreaterThan(0)
    expect(screen.getByText(/valid until|expires|expired/)).toBeInTheDocument()
    expect(screen.getByText(/gpg --verify/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Copy fingerprint" })).toBeInTheDocument()
  })

  it("lists the site's pages, including ones that only exist with content", () => {
    render(<SiteFooter extraLinks={[{ label: "Now", href: "/now" }]} />)
    const nav = within(screen.getByRole("navigation", { name: "Footer" }))
    for (const href of ["/post", "/projects", "/homecave", "/now", "/#contact", "/rss.xml"]) {
      expect(
        nav.getAllByRole("link").some((a) => a.getAttribute("href") === href),
        href,
      ).toBe(true)
    }
  })
})
