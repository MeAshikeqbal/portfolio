// @vitest-environment node
import { describe, expect, it } from "vitest"
import { formatUtcStamp, labShareFacts } from "@/lib/lab/share"
import type { LabNodeStatus } from "@/lib/lab/types"

const now = new Date("2026-11-10T12:00:00Z")
const ago = (s: number) => new Date(now.getTime() - s * 1000).toISOString()
const empty = { t: [], cpu: [], mem: [], netIn: [], netOut: [], temp: [], gpu: [], edge: [] }

const node = (name: string, extra: Partial<LabNodeStatus> = {}): LabNodeStatus => ({
  name,
  online: true,
  uptime: 540_000,
  interval: 30,
  receivedAt: ago(10),
  history: empty,
  availability24h: 100,
  ...extra,
})

const tower = node("Tower", {
  guests: { running: 7, total: 8, byCategory: { media: [2, 2] } },
  storage: [
    { label: "Bulk storage", usedGiB: 2580, totalGiB: 3597, health: "ONLINE", kind: "pool" },
    { label: "Off-site backups", usedGiB: 15, totalGiB: 65, health: null, kind: "backup" },
  ],
  services: [{ name: "jellyfin", up: true }],
})
const mini = node("Mini PC #2", { uptime: 7_200, receivedAt: ago(5) })

describe("labShareFacts", () => {
  it("claims nothing without a heartbeat", () => {
    expect(labShareFacts(null, now)).toEqual({
      status: { status: "idle", label: "no data" },
      footer: [],
    })
  })

  it("claims nothing when every heartbeat is stale", () => {
    const stale = { nodes: [{ ...tower, receivedAt: ago(3600) }] }
    expect(labShareFacts(stale, now).footer).toEqual([])
    expect(labShareFacts(stale, now).status.status).toBe("idle")
  })

  it("reports the verdict and measured counts", () => {
    const facts = labShareFacts({ nodes: [tower, mini] }, now)
    expect(facts.status).toEqual({ status: "up", label: "2/2 up" })
    expect(facts.footer).toEqual([
      "uptime 2h", // the shortest: how long the whole cluster has been up
      "7/8 guests",
      "1/1 pools",
      "measured Nov 10 11:59 UTC",
    ])
  })

  it("never names a machine, service or volume", () => {
    const text = JSON.stringify(labShareFacts({ nodes: [tower, mini] }, now))
    for (const name of ["Tower", "Mini PC", "jellyfin", "Bulk storage", "backups"]) {
      expect(text).not.toContain(name)
    }
  })

  it("goes amber when only some machines are up", () => {
    const down = { ...mini, online: false }
    expect(labShareFacts({ nodes: [tower, down] }, now).status).toEqual({
      status: "warn",
      label: "1/2 up",
    })
  })
})

describe("formatUtcStamp", () => {
  it("is timezone-independent", () => {
    expect(formatUtcStamp("2026-03-01T23:05:00+05:30")).toBe("Mar 1 17:35 UTC")
  })
})
