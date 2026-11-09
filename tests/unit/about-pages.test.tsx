import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { NowView } from "@/components/about/now-view"
import { UsesView } from "@/components/about/uses-view"

describe("UsesView", () => {
  it("renders sections and items, linking items that have a URL", () => {
    render(
      <UsesView
        uses={{
          _updatedAt: "2026-11-01T00:00:00Z",
          intro: "My setup.",
          sections: [
            {
              _key: "s1",
              title: "Homelab",
              items: [
                {
                  _key: "i1",
                  name: "Proxmox",
                  description: "Hypervisor",
                  url: "https://proxmox.com",
                  icon: "simple-icons:proxmox",
                },
                { _key: "i2", name: "Raspberry Pi", description: null, url: null, icon: null },
              ],
            },
            { _key: "s2", title: "Empty section", items: [] },
          ],
        }}
      />,
    )
    expect(screen.getByRole("heading", { level: 1, name: "Uses" })).toBeVisible()
    expect(screen.getByText("My setup.")).toBeVisible()
    expect(screen.getByText("Nov 1, 2026", { exact: false })).toBeVisible()
    expect(screen.getByRole("link", { name: /Proxmox/ })).toHaveAttribute(
      "href",
      "https://proxmox.com",
    )
    expect(screen.getByText("Raspberry Pi").tagName).toBe("P")
    // Empty sections are skipped.
    expect(screen.queryByText("Empty section")).toBeNull()
  })
})

describe("NowView", () => {
  it("renders the update with its date and location", () => {
    render(
      <NowView
        now={{
          _updatedAt: "2026-11-09T00:00:00Z",
          location: "Kolkata",
          body: [
            {
              _type: "block",
              _key: "b1",
              style: "normal",
              markDefs: [],
              children: [{ _type: "span", _key: "c1", text: "Rebuilding my homelab.", marks: [] }],
            },
          ],
        }}
      />,
    )
    expect(screen.getByRole("heading", { level: 1, name: "Now" })).toBeVisible()
    expect(screen.getByText(/updated Nov 9, 2026/)).toBeVisible()
    expect(screen.getByText("Kolkata")).toBeVisible()
    expect(within(screen.getByRole("article")).getByText("Rebuilding my homelab.")).toBeVisible()
  })
})
