/**
 * The store's Lua against a real Redis, through an Upstash-REST shim. Skipped unless
 * LAB_REDIS_SHIM points at one (e.g. a throwaway `redis` container plus a small HTTP shim that
 * forwards each POSTed JSON command). Each run starts from an empty database.
 */
import { beforeAll, describe, expect, it } from "vitest"
import { readLabReliability, writeHeartbeat } from "@/lib/lab/store"
import type { LabNode } from "@/lib/lab/types"

const shim = process.env.LAB_REDIS_SHIM
const env = { UPSTASH_REDIS_REST_URL: shim ?? "", UPSTASH_REDIS_REST_TOKEN: "t" }

const T0 = Date.UTC(2026, 10, 16, 10, 0, 0)
const at = (seconds: number) => new Date(T0 + seconds * 1000)
const signed = (seconds: number) => T0 / 1000 + seconds

function node(name: string, extra: Partial<LabNode> = {}): LabNode {
  return {
    name,
    online: true,
    uptime: 3600,
    interval: 30,
    cpu: { pct: 5, model: null, cores: 4, threads: 4 },
    peers: [],
    ...extra,
  }
}

const tower = (extra: Partial<LabNode> = {}) =>
  node("Tower", {
    services: [{ name: "Jellyfin", up: true }],
    storage: [
      { label: "Bulk storage", usedGiB: 1, totalGiB: 2, health: "ONLINE", kind: "pool" },
      { label: "Off-site backups", usedGiB: 1, totalGiB: 2, health: null, kind: "backup" },
    ],
    backup: { at: 1, status: "ok", covered: 1, total: 1 },
    ...extra,
  })

async function send(n: LabNode, seconds: number) {
  return writeHeartbeat([n], signed(seconds), at(seconds), env)
}

describe.skipIf(!shim)("store against a real Redis", () => {
  beforeAll(async () => {
    await fetch(shim!, { method: "POST", body: JSON.stringify(["FLUSHALL"]) })
  })

  it("logs transitions, gaps and ongoing trouble, and rolls up uptime", async () => {
    // First reports: states are recorded, nothing is an event yet.
    expect(await send(tower(), 0)).toEqual({ written: 1, events: [] })
    expect((await send(node("Mini PC #1", { wan: { rttMs: 9, lossPct: 0 } }), 1)).events).toEqual(
      [],
    )
    expect((await send(node("Mini PC #2"), 2)).events).toEqual([])

    // A service goes down, then comes back 2 minutes later.
    const down = await send(tower({ services: [{ name: "Jellyfin", up: false }] }), 30)
    expect(down.events).toEqual([
      { t: signed(30), id: "svc:Jellyfin", from: "up", to: "down", d: 30 },
    ])
    const back = await send(tower(), 150)
    expect(back.events).toEqual([
      { t: signed(150), id: "svc:Jellyfin", from: "down", to: "up", d: 120 },
    ])

    // A replay of an old heartbeat changes nothing.
    expect(await send(tower({ services: [{ name: "Jellyfin", up: false }] }), 30)).toEqual({
      written: 0,
      events: [],
    })

    // Mini PC #2 falls silent; Tower sees it offline; it's back 15 minutes later.
    const offline = { peers: [{ name: "Mini PC #2", online: false }] }
    const seen = await send(tower(offline), 300)
    expect(seen.events).toEqual([
      { t: signed(300), id: "node:Mini PC #2", from: "up", to: "down", d: 298 },
    ])
    // Seen offline again: still the same incident.
    expect((await send(tower(offline), 330)).events).toEqual([])
    for (const s of [450, 600, 750, 900, 1050]) expect((await send(tower(), s)).events).toEqual([])
    expect((await send(tower(), 1200)).events).toEqual([])
    const recovered = await send(node("Mini PC #2"), 1200)
    expect(recovered.events).toEqual([
      { t: signed(1200), id: "node:Mini PC #2", from: "down", to: "up", d: 900 },
    ])

    // Mini PC #1 goes quiet for 20 minutes without anyone noticing: a gap, logged on return.
    const gap = await send(node("Mini PC #1", { wan: { rttMs: 9, lossPct: 0 } }), 1201)
    expect(gap.events).toEqual([
      { t: signed(1), id: "node:Mini PC #1", from: "up", to: "nodata", d: 1200 },
    ])

    // A pool degrades and stays that way: an ongoing incident.
    const degraded = await send(
      tower({
        storage: [
          { label: "Bulk storage", usedGiB: 1, totalGiB: 2, health: "DEGRADED", kind: "pool" },
        ],
      }),
      1350,
    )
    expect(degraded.events.map((e) => [e.id, e.to])).toEqual([
      ["pool:Tower/Bulk storage", "DEGRADED"],
    ])

    const r = await readLabReliability(env, fetch, { now: at(1400) })
    expect(r).not.toBeNull()
    expect(r!.incidents).toEqual([
      {
        kind: "pool",
        node: "Tower",
        name: "Bulk storage",
        state: "DEGRADED",
        start: signed(1350),
        end: null,
      },
      { kind: "node", name: "Mini PC #1", state: "nodata", start: signed(1), end: signed(1201) },
      { kind: "node", name: "Mini PC #2", state: "down", start: signed(300), end: signed(1200) },
      { kind: "svc", name: "Jellyfin", state: "down", start: signed(30), end: signed(150) },
    ])
    expect(r!.days).toHaveLength(90)
    expect(r!.days.at(-1)).toBe("2026-11-16")
    const rows = Object.fromEntries(r!.uptime.map((row) => [row.name, row.days.at(-1)]))
    expect(r!.uptime.map((row) => row.name)).toEqual([
      "Mini PC #1",
      "Mini PC #2",
      "Tower",
      "Internet",
      "Jellyfin",
    ])
    // 5-minute samples: Tower at 0, 300, 600, 900, 1200 (the down at 30 fell between them).
    expect(rows.Jellyfin).toEqual({ up: 5, total: 5 })
    // Mini PC #2: up at 2, down when Tower saw it at 330 (300 was inside its window), up at 1200.
    expect(rows["Mini PC #2"]).toEqual({ up: 2, total: 3 })
    // A percentage from whatever has been recorded, even under a day.
    expect(r!.uptime.find((row) => row.name === "Mini PC #2")!.pct).toBe(66.6)
    expect(r!.uptime.find((row) => row.name === "Jellyfin")!.pct).toBe(100)
  })
})
