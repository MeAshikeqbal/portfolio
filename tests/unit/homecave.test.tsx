import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { LabDashboardView, type NodeSpec } from "@/components/homecave/lab-dashboard"
import { formatBytes, formatPercent, formatRate } from "@/lib/format"
import type { LabNodeStatus, LabStatus } from "@/lib/lab/types"

const now = new Date("2026-11-10T12:00:00Z")
const ago = (s: number) => new Date(now.getTime() - s * 1000).toISOString()
const empty = { t: [], cpu: [], mem: [], netIn: [], netOut: [] }
const specs: NodeSpec[] = [
  { name: "Proxmox VE cluster", description: "3 nodes" },
  { name: "Tower", description: "GTX 1050 Ti" },
  { name: "Mini PC #2", description: "Media automation" },
]
const tower: LabNodeStatus = {
  name: "Tower",
  online: true,
  uptime: 540_000,
  interval: 30,
  cpu: { pct: 6, model: "Ryzen 5 3600", cores: 6, threads: 12 },
  load: [0.42, 0.31, 0.25],
  mem: { pct: 79, totalGiB: 15.5 },
  swap: { pct: 54, totalGiB: 3.9 },
  net: { inKBps: 641, outKBps: 89 },
  guests: { running: 7, total: 7, byCategory: { media: [2, 2], apps: [2, 2] } },
  storage: [
    { label: "Bulk storage", usedGiB: 2580, totalGiB: 3597, health: "ONLINE", kind: "pool" },
    { label: "Off-site backups", usedGiB: 15, totalGiB: 65, health: null, kind: "backup" },
  ],
  peers: [{ name: "Mini PC #2", online: false }],
  receivedAt: ago(10),
  history: { ...empty, cpu: [5, 6, 7], mem: [78, 79], netIn: [600, 641] },
  availability24h: 100,
}
const mini2: LabNodeStatus = {
  name: "Mini PC #2",
  online: true,
  uptime: 518_400,
  interval: 30,
  receivedAt: ago(3600),
  history: empty,
  availability24h: null,
}

describe("Homecave dashboard", () => {
  it("before any heartbeat: spec sheet only, no claims", () => {
    render(<LabDashboardView status={null} now={now} specs={specs} />)
    expect(screen.getByText("no data yet")).toBeVisible()
    expect(screen.getByText("the lab hasn't reported yet")).toBeVisible()
    // Every Studio row is shown as plain overview, with no status pill.
    expect(screen.getByText("Tower")).toBeVisible()
    expect(screen.queryByText(/up ·/)).toBeNull()
  })

  it("renders a fresh node with measured hardware, metrics and guests", () => {
    render(<LabDashboardView status={{ nodes: [tower] }} now={now} specs={specs} />)
    const panel = screen
      .getByText("Ryzen 5 3600 · 6 cores / 12 threads")
      .closest("div")!.parentElement!
    expect(within(panel).getByText("up · 6d")).toHaveClass("text-status-up-fg")
    expect(within(panel).getByText("GTX 1050 Ti")).toBeVisible()
    expect(within(panel).getByText("load 0.42 · 0.31 · 0.25")).toBeVisible()
    expect(within(panel).getByText("100% up · 24h")).toBeVisible()
    expect(within(panel).getByText("media 2")).toBeVisible()
    expect(screen.getByText("1/1 up")).toBeVisible()
    // Storage: health as a word, usage as text plus a neutral meter.
    expect(screen.getAllByText("healthy")[0]).toHaveClass("text-status-up-fg")
    expect(screen.getAllByText("2.5 TiB / 3.5 TiB")[0]).toBeVisible()
    expect(screen.getByRole("meter", { name: "Bulk storage used" })).toHaveAttribute(
      "aria-valuetext",
      "72%",
    )
    expect(screen.getByText("Off-site backups")).toBeVisible()
  })

  it("shows a silent node as down when a fresh peer sees it offline", () => {
    render(<LabDashboardView status={{ nodes: [tower, mini2] }} now={now} specs={specs} />)
    expect(screen.getByText("down")).toHaveClass("text-status-down-fg")
    expect(screen.getByText(/Not reporting, and the other nodes see it offline/)).toBeVisible()
    expect(screen.getByText("1/2 up")).toHaveClass("text-status-warn-fg")
  })

  it("greys out a stale node and its pool health, with the time of the data", () => {
    const stale = { ...tower, peers: [], receivedAt: ago(600) }
    render(<LabDashboardView status={{ nodes: [stale] }} now={now} specs={specs} />)
    expect(screen.getAllByText("no data").length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/as of 11:50 UTC/)).toBeVisible()
    expect(screen.queryByText("healthy")).toBeNull()
  })

  it("orders nodes like the Studio's Homelab rows", () => {
    const status: LabStatus = { nodes: [{ ...mini2, receivedAt: ago(5) }, tower] }
    render(<LabDashboardView status={status} now={now} specs={specs} />)
    const nodes = screen.getByRole("region", { name: "Nodes" })
    const names = within(nodes)
      .getAllByText(/^(Tower|Mini PC #2)$/)
      .map((el) => el.textContent)
    expect(names).toEqual(["Tower", "Mini PC #2"])
  })
})

describe("formatters", () => {
  it("formats bytes, rates and percentages", () => {
    expect(formatBytes(512)).toBe("512 GiB")
    expect(formatBytes(3597)).toBe("3.5 TiB")
    expect(formatRate(641)).toBe("641 KB/s")
    expect(formatRate(2458)).toBe("2.4 MB/s")
    expect(formatPercent(99.94)).toBe("99.9%")
    expect(formatPercent(100)).toBe("100%")
    expect(formatBytes(Number.NaN)).toBe("—")
  })
})
