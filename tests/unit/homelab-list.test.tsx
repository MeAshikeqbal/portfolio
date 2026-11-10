import { render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { HomelabList } from "@/components/home/homelab-list"
import { resetLabStatus } from "@/components/lab/use-lab-status"

describe("HomelabList", () => {
  it("renders named items and links to the live dashboard", () => {
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
    expect(screen.getByRole("link", { name: "live dashboard" })).toHaveAttribute(
      "href",
      "/homecave",
    )
  })

  it("marks machines with a dot, and spells out trouble; spec rows get neither", async () => {
    const at = (s: number) => new Date(Date.now() - s * 1000).toISOString()
    const node = (name: string, receivedAt: string, extra = {}) => ({
      name,
      online: true,
      uptime: 90_000,
      interval: 30,
      receivedAt,
      history: { t: [], cpu: [], mem: [], netIn: [], netOut: [], temp: [], gpu: [], edge: [] },
      availability24h: null,
      ...extra,
    })
    const status = {
      nodes: [
        node("Tower", at(5), { peers: [{ name: "Mini PC #2", online: false }] }),
        node("Mini PC #2", at(900)),
      ],
    }
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(status))),
    )
    render(
      <HomelabList
        items={[
          { _key: "t", name: "Tower", description: "GTX 1050 Ti" },
          { _key: "m", name: "Mini PC #2", description: "Media automation" },
          { _key: "s", name: "Storage", description: "ZFS pool" },
        ]}
      />,
    )
    const [tower, mini, storage] = screen.getAllByRole("listitem")
    // Healthy: a dot (named for screen readers), no word. The header's "2/2 up"-style
    // summary carries the words.
    expect(await within(tower).findByText("up:")).toHaveClass("sr-only")
    expect(within(tower).queryByText(/^up$/)).toBeNull()
    expect(await within(mini).findByText("down")).toHaveClass("text-status-down-fg")
    expect(storage.querySelector('[class*="bg-status"]')).toBeNull()
  })

  it("shows only the lab's machines when it knows them, every row otherwise", () => {
    const items = [
      { _key: "c", name: "Proxmox VE cluster", description: "3 nodes" },
      { _key: "t", name: "Tower", description: "GTX 1050 Ti" },
      { _key: "s", name: "Storage", description: "ZFS pool" },
    ]
    const { rerender } = render(<HomelabList items={items} machines={["Tower", "Mini PC #1"]} />)
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "TowerGTX 1050 Ti",
    ])
    rerender(<HomelabList items={items} machines={["Unrelated"]} />)
    expect(screen.getAllByRole("listitem")).toHaveLength(3)
  })

  it("renders nothing without named items", () => {
    const { container: empty } = render(<HomelabList items={[]} />)
    expect(empty).toBeEmptyDOMElement()
    const { container: missing } = render(<HomelabList items={null} />)
    expect(missing).toBeEmptyDOMElement()
  })
})

afterEach(() => {
  resetLabStatus()
  vi.unstubAllGlobals()
})
