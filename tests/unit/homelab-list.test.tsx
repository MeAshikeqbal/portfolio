import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { HomelabList } from "@/components/home/homelab-list"

describe("HomelabList", () => {
  it("renders named items and links to the full setup", () => {
    render(
      <HomelabList
        items={[
          { _key: "a", name: "Proxmox VE cluster", description: "3 nodes" },
          { _key: "b", name: "", description: "nameless" },
          { _key: "c", name: null, description: null },
          { _key: "d", name: "Tower", description: null },
        ]}
      />,
    )
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
    expect(screen.getByText("Proxmox VE cluster")).toBeVisible()
    expect(screen.queryByText("nameless")).toBeNull()
    expect(screen.getByRole("link", { name: "full setup" })).toHaveAttribute("href", "/uses")
  })

  it("renders nothing without named items", () => {
    const { container: empty } = render(<HomelabList items={[]} />)
    expect(empty).toBeEmptyDOMElement()
    const { container: missing } = render(<HomelabList items={null} />)
    expect(missing).toBeEmptyDOMElement()
  })
})
