import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { LabDashboardView, type NodeSpec } from "@/components/homecave/lab-dashboard"
import { sparklinePoints } from "@/components/dashboard/sparkline"
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
    expect(screen.getByText("the lab hasn't reported yet")).toBeVisible()
    // Every Studio row is shown as plain overview, with no status pill or verdict.
    expect(screen.getByText("Tower")).toBeVisible()
    expect(screen.queryByText(/nodes up/)).toBeNull()
    expect(screen.queryByText(/^up/)).toBeNull()
  })

  it("leads with a one-line verdict for the whole cluster", () => {
    render(<LabDashboardView status={{ nodes: [tower] }} now={now} specs={specs} />)
    expect(screen.getByText("1/1 nodes up")).toHaveClass("text-status-up-fg")
    expect(screen.getByText("1/1 pools healthy")).toHaveClass("text-status-up-fg")
    // Guests are a count, not a status: neutral ink.
    expect(screen.getByText("7/7 guests running")).not.toHaveClass("text-status-up-fg")
    expect(screen.getByText(/updated just now · reports every 30s/)).toBeVisible()
    expect(screen.queryByText(/reporting/)).toBeNull()
  })

  it("renders a fresh node with measured hardware, metrics and guests", () => {
    render(<LabDashboardView status={{ nodes: [tower] }} now={now} specs={specs} />)
    const panel = screen.getByRole("region", { name: "Tower" })
    expect(within(panel).getByRole("heading", { level: 2, name: "Tower" })).toBeVisible()
    expect(within(panel).getByText("Ryzen 5 3600 · 6 cores / 12 threads")).toBeVisible()
    // Compact badge: uptime lives in its own metric, so the pill doesn't repeat it.
    expect(within(panel).getByText("up")).toHaveClass("text-status-up-fg")
    expect(within(panel).getByText(/^6d/)).toBeVisible()
    expect(within(panel).getByText("GTX 1050 Ti")).toBeVisible()
    expect(within(panel).getByText("load 0.42 · 0.31 · 0.25")).toBeVisible()
    expect(within(panel).getByText("out 89 KB/s")).toBeVisible()
    expect(within(panel).getByText("100% up · 24h")).toBeVisible()
    expect(within(panel).getByText("media 2")).toBeVisible()
    expect(within(panel).queryByText(/last seen/)).toBeNull()
    // Storage: its own landmark; health as a word, usage as text plus a neutral meter.
    const storage = screen.getByRole("region", { name: "storage" })
    expect(within(storage).getAllByText("healthy")[0]).toHaveClass("text-status-up-fg")
    expect(within(storage).getAllByText("2.5 TiB / 3.5 TiB")[0]).toBeVisible()
    expect(screen.getByRole("meter", { name: "Bulk storage on Tower, used" })).toHaveAttribute(
      "aria-valuetext",
      "72%",
    )
    expect(screen.getByRole("meter", { name: "Off-site backups, used" })).toBeVisible()
  })

  it("draws CPU and memory trends on a fixed 0-100% scale", () => {
    render(<LabDashboardView status={{ nodes: [tower] }} now={now} specs={specs} />)
    // On a 0-100 domain a 5-7% CPU line sits near the bottom instead of filling the height.
    const path = screen.getByRole("img", { name: /Tower CPU %/ }).querySelector("path")!
    const ys = [...path.getAttribute("d")!.matchAll(/[ML][\d.]+ ([\d.]+)/g)].map((m) =>
      Number(m[1]),
    )
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(1)
    expect(Math.min(...ys)).toBeGreaterThan(18)
    expect(sparklinePoints([5, 7], 64, 24, 3, [0, 100]).map((p) => p.y)).toEqual([
      expect.closeTo(20.1, 1),
      expect.closeTo(19.74, 1),
    ])
  })

  it("shows a silent node as down, keeping its last readings", () => {
    const lastKnown = { ...mini2, cpu: tower.cpu, mem: tower.mem }
    render(<LabDashboardView status={{ nodes: [tower, lastKnown] }} now={now} specs={specs} />)
    const panel = screen.getByRole("region", { name: "Mini PC #2" })
    expect(within(panel).getByText("down")).toHaveClass("text-status-down-fg")
    expect(
      within(panel).getByText(/Not reporting, and the other nodes see it offline/),
    ).toBeVisible()
    expect(within(panel).getByText("last seen 1h ago")).toBeVisible()
    expect(panel.querySelector("dl")).toHaveClass("opacity-55")
    expect(screen.getByText("1/2 nodes up")).toHaveClass("text-status-warn-fg")
    expect(screen.getByText(/^1 of 2 reporting/)).toBeVisible()
  })

  it("greys out a stale node and its pool health, with when it was last seen", () => {
    const stale = { ...tower, peers: [], receivedAt: ago(600) }
    render(<LabDashboardView status={{ nodes: [stale] }} now={now} specs={specs} />)
    expect(screen.getAllByText("no data").length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText("last seen 10m ago")).toBeVisible()
    expect(screen.queryByText("healthy")).toBeNull()
    // Uptime isn't claimed for a machine we can't see.
    expect(screen.queryByText(/^6d/)).toBeNull()
  })

  it("orders nodes like the Studio's Homelab rows", () => {
    const status: LabStatus = { nodes: [{ ...mini2, receivedAt: ago(5) }, tower] }
    render(<LabDashboardView status={status} now={now} specs={specs} />)
    const nodes = screen.getByRole("region", { name: "Nodes" })
    const names = within(nodes)
      .getAllByRole("heading", { level: 2 })
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
