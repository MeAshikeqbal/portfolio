import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { LabTopologyView } from "@/components/homecave/lab-topology"
import { labTopology } from "@/lib/lab/topology"
import type { LabNodeStatus, LabStatus } from "@/lib/lab/types"

const now = new Date("2026-11-17T12:00:00Z")
const history = { t: [], cpu: [], mem: [], netIn: [], netOut: [], temp: [], gpu: [], edge: [] }
const node = (name: string, extra: Partial<LabNodeStatus> = {}, ageS = 10): LabNodeStatus => ({
  name,
  online: true,
  uptime: 3600 * 24 * 12,
  interval: 30,
  receivedAt: new Date(now.getTime() - ageS * 1000).toISOString(),
  history,
  availability24h: 100,
  ...extra,
})

const status: LabStatus = {
  nodes: [
    node("Mini PC #1", {
      wan: { rttMs: 10.3, lossPct: 0 },
      dns: { queries: 54_000, blockedPct: 6.3, hours: 24 },
      services: [{ name: "AdGuard Home", up: true }],
      storage: [{ label: "VM disks", usedGiB: 40, totalGiB: 200, health: "ONLINE", kind: "pool" }],
    }),
    node("Tower", {
      edge: { rpm: 17, errPct: 0 },
      gpu: { utilPct: 7, memUsedMiB: 690, memTotalMiB: 4096, tempC: 51, encoders: 1 },
      backup: { at: 1, status: "ok", covered: 17, total: 20 },
      services: [
        { name: "Jellyfin", up: true },
        { name: "Frigate", up: false },
      ],
      storage: [
        { label: "Off-site backups", usedGiB: 300, totalGiB: 1000, health: null, kind: "backup" },
        { label: "Bulk storage", usedGiB: 1800, totalGiB: 3600, health: "DEGRADED", kind: "pool" },
      ],
      guests: { running: 9, total: 11, byCategory: {} },
    }),
    // Silent for 10 minutes: nothing it last said counts as measured.
    node("Mini PC #2", { services: [{ name: "Homarr", up: true }] }, 600),
  ],
}

describe("labTopology", () => {
  const model = labTopology(status, now, ["Tower", "Mini PC #1", "Mini PC #2"])

  it("places what faces the internet on the machines that report it", () => {
    expect(model.internet).toEqual({ node: "Mini PC #1", status: "up", rttMs: 10.3, lossPct: 0 })
    expect(model.edge).toMatchObject({ node: "Tower", status: "up", rpm: 17 })
    expect(model.dns).toMatchObject({ node: "Mini PC #1", status: "up", blockedPct: 6.3 })
    expect(model.backups).toMatchObject({
      node: "Tower",
      status: "up",
      covered: 17,
      total: 20,
      usedPct: 30,
    })
  })

  it("lists machines in the Studio's order, with roles, services and pools", () => {
    expect(model.machines.map((m) => [m.name, m.roles])).toEqual([
      ["Tower", ["edge", "gpu", "backups"]],
      ["Mini PC #1", ["dns"]],
      ["Mini PC #2", []],
    ])
    const tower = model.machines[0]
    expect(tower.services).toEqual([
      { name: "Jellyfin", status: "up" },
      { name: "Frigate", status: "down" },
    ])
    // Pools only: the backup store is drawn below the machines.
    expect(tower.pools).toEqual([
      { name: "Bulk storage", health: "DEGRADED", status: "warn", usedPct: 50 },
    ])
  })

  it("claims nothing for a machine that has gone quiet", () => {
    const quiet = model.machines[2]
    expect(quiet.state?.status).toBe("idle")
    expect(quiet.services).toEqual([{ name: "Homarr", status: "idle" }])
  })

  it("rates packet loss and edge errors like the dashboard", () => {
    const lossy = labTopology(
      { nodes: [node("A", { wan: { rttMs: null, lossPct: 100 }, edge: { rpm: 3, errPct: 9 } })] },
      now,
    )
    expect(lossy.internet?.status).toBe("down")
    expect(lossy.edge?.status).toBe("warn")
    expect(lossy.backups).toBeNull()
  })
})

describe("LabTopologyView", () => {
  it("draws every tier with its readings", () => {
    render(
      <LabTopologyView status={status} now={now} order={["Tower", "Mini PC #1", "Mini PC #2"]} />,
    )
    const drawing = screen.getByRole("group", { name: "Lab topology" })
    expect(within(drawing).getByText("Internet")).toBeInTheDocument()
    expect(within(drawing).getByText("10 ms · 0% packet loss")).toBeInTheDocument()
    expect(within(drawing).getByText("17 req/min · 0% errors")).toBeInTheDocument()
    expect(within(drawing).getByText("6.3% blocked · 54,000 queries")).toBeInTheDocument()
    expect(within(drawing).getByText("last round ok · 17/20 guests")).toBeInTheDocument()
    const machines = screen.getByRole("list", { name: "3 machines" })
    expect(within(machines).getAllByRole("listitem", { name: undefined }).length).toBeGreaterThan(3)
    expect(screen.getByRole("list", { name: "Services on Tower" })).toHaveTextContent("Frigate")
    expect(screen.getByRole("list", { name: "Storage pools on Tower" })).toHaveTextContent(
      "50% used",
    )
  })

  it("draws nothing without machines", () => {
    const { container } = render(<LabTopologyView status={{ nodes: [] }} now={now} />)
    expect(container).toBeEmptyDOMElement()
  })
})
