// @vitest-environment node
import { ImageResponse } from "next/og"
import { describe, expect, it } from "vitest"
import { SNAPSHOT_WIDTH, SnapshotCard, snapshotHeight } from "@/components/homecave/snapshot-card"
import { labSnapshot, snapshotFilename, snapshotTime } from "@/lib/lab/snapshot"
import type { LabNodeStatus, LabStatus } from "@/lib/lab/types"
import { ogFonts } from "@/lib/og"

const now = new Date("2026-11-13T14:32:09Z")
const ago = (s: number) => new Date(now.getTime() - s * 1000).toISOString()
const day = (f: (i: number) => number) => Array.from({ length: 96 }, (_, i) => f(i))
const empty = { t: [], cpu: [], mem: [], netIn: [], netOut: [], temp: [], gpu: [], edge: [] }
const specs = [
  { name: "Tower", description: "GTX 1050 Ti · media and NVR" },
  { name: "Mini PC #1", description: "Network and passwords" },
  { name: "Mini PC #2", description: "Media automation" },
]

export const tower: LabNodeStatus = {
  name: "Tower",
  online: true,
  uptime: 1_036_800,
  interval: 30,
  cpu: { pct: 14, model: "Ryzen 5 3600", cores: 6, threads: 12 },
  load: [1.42, 1.31, 1.25],
  mem: { pct: 79, totalGiB: 15.5 },
  net: { inKBps: 641, outKBps: 89 },
  temps: { cpuC: 52, diskC: 38 },
  gpu: { utilPct: 23, memUsedMiB: 812, memTotalMiB: 4096, tempC: 48, encoders: 1 },
  guests: { running: 7, total: 7, byCategory: { media: [3, 3], storage: [1, 1], apps: [3, 3] } },
  storage: [
    { label: "Bulk storage", usedGiB: 2600, totalGiB: 3597, health: "ONLINE", kind: "pool" },
    { label: "VM disks", usedGiB: 180, totalGiB: 476, health: "ONLINE", kind: "pool" },
    { label: "Off-site backups", usedGiB: 15, totalGiB: 65, health: null, kind: "backup" },
  ],
  peers: [
    { name: "Mini PC #1", online: true },
    { name: "Mini PC #2", online: false },
  ],
  receivedAt: ago(12),
  history: { ...empty, cpu: day((i) => 10 + Math.round(8 * Math.sin(i / 6)) + (i % 7)) },
  availability24h: 100,
}
const mini1: LabNodeStatus = {
  name: "Mini PC #1",
  online: true,
  uptime: 3_456_000,
  interval: 30,
  cpu: { pct: 4, model: "Core i3-6100", cores: 2, threads: 4 },
  mem: { pct: 61, totalGiB: 23.4 },
  guests: { running: 5, total: 6, byCategory: { network: [3, 3], security: [1, 1], home: [1, 2] } },
  receivedAt: ago(20),
  history: { ...empty, cpu: day((i) => 3 + (i % 5)) },
  availability24h: 99.8,
}
// Silent for 20 minutes, and Tower sees it offline: "down", its last readings dimmed.
const mini2: LabNodeStatus = {
  name: "Mini PC #2",
  online: true,
  uptime: 518_400,
  interval: 30,
  cpu: { pct: 9, model: "Core i5-6500T", cores: 4, threads: 4 },
  mem: { pct: 48, totalGiB: 15.5 },
  guests: { running: 14, total: 14, byCategory: { media: [12, 12], network: [2, 2] } },
  receivedAt: ago(1200),
  history: { ...empty, cpu: day((i) => 8 + (i % 3)) },
  availability24h: 97.2,
}
export const status: LabStatus = { nodes: [mini2, tower, mini1] }

describe("labSnapshot", () => {
  it("is null before the lab has reported", () => {
    expect(labSnapshot(null, now)).toBeNull()
    expect(labSnapshot({ nodes: [] }, now)).toBeNull()
  })

  it("says what the dashboard says: verdict, node states and storage", () => {
    const snap = labSnapshot(status, now, specs)!
    expect(snap.summary).toEqual({ status: "warn", label: "2/3 up" })
    expect(snap.verdict.map((v) => v.text)).toEqual([
      "2/3 nodes up",
      "2/2 pools healthy",
      "12/13 guests running",
    ])
    expect(snap.freshness).toBe("2 of 3 reporting · updated just now · reports every 30s")
    // Studio order, not the store's.
    expect(snap.nodes.map((n) => [n.name, n.state?.label])).toEqual([
      ["Tower", "up · 12d"],
      ["Mini PC #1", "up · 40d"],
      ["Mini PC #2", "down"],
    ])
    const [t, , m2] = snap.nodes
    expect(t.metrics.map((m) => `${m.label} ${m.value}`)).toEqual([
      "cpu 14%",
      "memory 79%",
      "temperature 52°C",
      "gpu 23%",
    ])
    expect(t.role).toBe("GTX 1050 Ti · media and NVR")
    expect(t.cpuTrend).toHaveLength(96)
    expect(m2.live).toBe(false)
    expect(m2.lastSeen).toBe("last seen 20m ago")
    // A node that isn't up shows no uptime figure.
    expect(m2.metrics.find((m) => m.label === "uptime")?.value).toBe("—")
    expect(snap.pools.map((p) => [p.label, p.where, p.health?.label])).toEqual([
      ["Bulk storage", "Tower", "healthy"],
      ["VM disks", "Tower", "healthy"],
      ["Off-site backups", "off-site", undefined],
    ])
  })

  it("claims nothing for a stale lab", () => {
    const stale = { nodes: [{ ...tower, peers: [], receivedAt: ago(3600) }] }
    const snap = labSnapshot(stale, now)!
    expect(snap.summary).toEqual({ status: "idle", label: "no data" })
    expect(snap.nodes[0].state?.label).toBe("no data")
    expect(snap.pools.filter((p) => p.where === "Tower").map((p) => p.health?.label)).toEqual([
      "no data",
      "no data",
    ])
  })

  it("names the file and the moment in UTC", () => {
    expect(snapshotFilename(now)).toBe("homecave-2026-11-13-1432Z.png")
    expect(snapshotTime(now)).toBe("Nov 13, 2026 · 14:32 UTC")
  })
})

describe("SnapshotCard", () => {
  it("grows with the content it holds", () => {
    const snap = labSnapshot(status, now, specs)!
    expect(snapshotHeight(snap)).toBeGreaterThan(snapshotHeight(null))
    const fourNodes = { ...snap, nodes: [...snap.nodes, { ...snap.nodes[0], name: "Pi" }] }
    expect(snapshotHeight(fourNodes)).toBeGreaterThan(snapshotHeight(snap))
  })

  it.each([
    ["a live lab", labSnapshot(status, now, specs)],
    ["no heartbeat yet", null],
  ])("renders to a PNG for %s", async (_, snap) => {
    const response = new ImageResponse(
      <SnapshotCard snapshot={snap} takenAt={snapshotTime(now)} />,
      {
        width: SNAPSHOT_WIDTH,
        height: snapshotHeight(snap),
        fonts: await ogFonts(),
      },
    )
    const bytes = new Uint8Array(await response.arrayBuffer())
    // The PNG signature.
    expect([...bytes.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47])
  })
})
