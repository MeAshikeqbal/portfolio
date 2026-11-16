import { describe, expect, it } from "vitest"
import { alertFor, sendAlerts } from "@/lib/lab/alerts"
import { formatDuration } from "@/lib/format"
import {
  buildIncidents,
  buildUptime,
  dayLevel,
  encodeReadings,
  entitiesFor,
  lastDays,
  parseEntityId,
  parseEvent,
  parseState,
  toPublicReliability,
  writeupFor,
  type LabReliability,
} from "@/lib/lab/incidents"
import type { LabNode } from "@/lib/lab/types"

const NOW_S = Date.UTC(2026, 10, 16, 12) / 1000

describe("entities", () => {
  it("reads every tracked thing from a node's own report", () => {
    const node: LabNode = {
      name: "Tower",
      online: true,
      uptime: 0,
      services: [
        { name: "Jellyfin", up: true },
        { name: "Frigate", up: false },
      ],
      storage: [
        { label: "Bulk storage", usedGiB: 1, totalGiB: 2, health: "DEGRADED", kind: "pool" },
        { label: "VM disks", usedGiB: 1, totalGiB: 2, health: null, kind: "pool" },
        { label: "Off-site backups", usedGiB: 1, totalGiB: 2, health: null, kind: "backup" },
      ],
      wan: { rttMs: null, lossPct: 100 },
      backup: { at: 1, status: "failed", covered: 1, total: 2 },
    }
    expect(entitiesFor(node)).toEqual([
      { id: "node:Tower", state: "up", bar: 1 },
      { id: "svc:Jellyfin", state: "up", bar: 1 },
      { id: "svc:Frigate", state: "down", bar: 0 },
      // Pools without a health reading, and backup stores, claim nothing.
      { id: "pool:Tower/Bulk storage", state: "DEGRADED" },
      { id: "wan:Internet", state: "down", bar: 0 },
      { id: "backup:Backups", state: "failed" },
    ])
    expect(encodeReadings(entitiesFor({ name: "Tower", online: true, uptime: 0 }))).toBe(
      "node:Tower\tup\t1",
    )
  })

  it("only counts the line down when every probe is lost", () => {
    const wan = (lossPct: number) =>
      entitiesFor({ name: "Mini PC #1", online: true, uptime: 0, wan: { rttMs: 900, lossPct } })[1]
    expect(wan(60).state).toBe("up")
    expect(wan(100).state).toBe("down")
  })

  it("parses ids, events and states defensively", () => {
    expect(parseEntityId("pool:Tower/VM disks")).toEqual({
      kind: "pool",
      node: "Tower",
      name: "VM disks",
    })
    expect(parseEntityId("svc:Sonarr, Radarr, Lidarr")).toEqual({
      kind: "svc",
      name: "Sonarr, Radarr, Lidarr",
    })
    for (const bad of ["", "svc:", "evil:x", "pool:Tower", "pool:/x"]) {
      expect(parseEntityId(bad)).toBeNull()
    }
    expect(parseEvent("10\tnode:Tower\tup\tdown\t5")).toEqual({
      t: 10,
      id: "node:Tower",
      from: "up",
      to: "down",
      d: 5,
    })
    for (const bad of [
      null,
      5,
      "x",
      "10\tnode:Tower\tup\tdown",
      "a\tb\tc\td\te",
      "1\ti\ta\tb\t-1",
    ]) {
      expect(parseEvent(bad)).toBeNull()
    }
    expect(parseState("down|10|20")).toEqual({ state: "down", since: 10, seen: 20 })
    expect(parseState("down|x|20")).toBeNull()
  })
})

describe("incidents", () => {
  it("turns transitions and gaps into resolved incidents, and bad states into ongoing ones", () => {
    const events = [
      // Newest first, as stored.
      { t: NOW_S - 100, id: "svc:Jellyfin", from: "down", to: "up", d: 300 },
      { t: NOW_S - 400, id: "svc:Jellyfin", from: "up", to: "down", d: 9000 },
      { t: NOW_S - 5000, id: "node:Tower", from: "up", to: "nodata", d: 720 },
      // A change between two healthy states isn't an incident.
      { t: NOW_S - 6000, id: "backup:Backups", from: "ok", to: "ok", d: 1 },
      // Older than 30 days: dropped.
      { t: NOW_S - 31 * 86_400, id: "node:Tower", from: "down", to: "up", d: 60 },
    ]
    const states = {
      "pool:Tower/Bulk storage": { state: "DEGRADED", since: NOW_S - 50, seen: NOW_S - 10 },
      "svc:Jellyfin": { state: "up", since: NOW_S - 100, seen: NOW_S - 10 },
      // A leftover nobody has reported for days (a renamed service): not news.
      "svc:Old name": { state: "down", since: NOW_S - 9 * 86_400, seen: NOW_S - 8 * 86_400 },
    }
    expect(buildIncidents(events, states, NOW_S)).toEqual([
      {
        kind: "pool",
        node: "Tower",
        name: "Bulk storage",
        state: "DEGRADED",
        start: NOW_S - 50,
        end: null,
      },
      { kind: "svc", name: "Jellyfin", state: "down", start: NOW_S - 400, end: NOW_S - 100 },
      { kind: "node", name: "Tower", state: "nodata", start: NOW_S - 5000, end: NOW_S - 4280 },
    ])
  })

  it("links an incident to the post written about it, a day either side", () => {
    const writeups = [
      { title: "When the pool degraded", slug: "pool", incident: "2026-11-10" },
      { title: "Unrelated", slug: "other", incident: "2026-10-01" },
    ]
    const at = (iso: string) => Date.parse(iso) / 1000
    // Started late on Nov 9 UTC (Nov 10 where the author lives).
    expect(
      writeupFor(
        { start: at("2026-11-09T21:00:00Z"), end: at("2026-11-09T22:00:00Z") },
        writeups,
        NOW_S,
      )?.slug,
    ).toBe("pool")
    expect(
      writeupFor(
        { start: at("2026-11-12T10:00:00Z"), end: at("2026-11-12T11:00:00Z") },
        writeups,
        NOW_S,
      ),
    ).toBeNull()
    // Ongoing incidents reach to today.
    expect(
      writeupFor({ start: at("2026-11-08T10:00:00Z"), end: null }, writeups, NOW_S)?.slug,
    ).toBe("pool")
  })
})

describe("uptime bars", () => {
  const days = lastDays(new Date(NOW_S * 1000), 3)

  it("covers the last days in UTC, oldest first", () => {
    expect(days).toEqual(["2026-11-14", "2026-11-15", "2026-11-16"])
    expect(lastDays(new Date("2026-03-01T23:59:00Z"), 2)).toEqual(["2026-02-28", "2026-03-01"])
  })

  it("rolls up per entity, machines first, and only claims a percentage after a day", () => {
    const rows = buildUptime(
      [
        {},
        {
          "node:Tower:n": "288",
          "node:Tower:u": "288",
          "svc:Jellyfin:n": "10",
          "svc:Jellyfin:u": "4",
        },
        {
          "node:Tower:n": "100",
          "node:Tower:u": "99",
          "wan:Internet:n": "5",
          "wan:Internet:u": "5",
          // Not drawn as bars, and junk: ignored.
          "pool:Tower/VM disks:n": "3",
          bogus: "1",
          "node:Tower:x": "1",
        },
      ],
      days,
    )
    expect(rows.map((r) => [r.kind, r.name, r.pct])).toEqual([
      ["node", "Tower", 99.7],
      ["wan", "Internet", null],
      ["svc", "Jellyfin", null],
    ])
    expect(rows[0].days).toEqual([null, { up: 288, total: 288 }, { up: 99, total: 100 }])
    expect(rows[0].days.map(dayLevel)).toEqual(["none", "up", "partial"])
    expect(dayLevel(rows[2].days[1])).toBe("down")
  })

  it("never reports more up samples than taken", () => {
    const [row] = buildUptime([{ "node:Tower:n": "1", "node:Tower:u": "5" }], ["2026-11-16"])
    expect(row.days[0]).toEqual({ up: 1, total: 1 })
  })

  it("rebuilds the public shape field by field", () => {
    const record = {
      incidents: [{ kind: "svc", name: "Jellyfin", state: "down", start: 1, end: 2, secret: "x" }],
      days: ["2026-11-16"],
      uptime: [
        { kind: "node", name: "Tower", days: [{ up: 1, total: 1, ip: "10.0.0.1" }], pct: null },
      ],
    } as unknown as LabReliability
    expect(JSON.stringify(toPublicReliability(record))).not.toMatch(/secret|10\.0\.0\.1/)
  })
})

describe("alerts", () => {
  it("words each transition plainly, loud only when something broke", () => {
    expect(alertFor({ t: 1, id: "node:Mini PC #2", from: "up", to: "down", d: 60 })).toMatchObject({
      title: "Mini PC #2: down",
      priority: 4,
    })
    expect(alertFor({ t: 1, id: "node:Mini PC #2", from: "down", to: "up", d: 720 })).toMatchObject(
      {
        title: "Mini PC #2 recovered",
        message: "Mini PC #2 is up again after 12 min down.",
        priority: 3,
      },
    )
    expect(alertFor({ t: 1, id: "node:Tower", from: "up", to: "nodata", d: 600 })?.title).toBe(
      "Tower was silent for 10 min",
    )
    expect(
      alertFor({ t: 1, id: "pool:Tower/Bulk storage", from: "ONLINE", to: "DEGRADED", d: 1 })
        ?.title,
    ).toBe("Bulk storage on Tower: DEGRADED")
    expect(alertFor({ t: 1, id: "backup:Backups", from: "ok", to: "failed", d: 1 })?.title).toBe(
      "Backups: backup round failed",
    )
    expect(alertFor({ t: 1, id: "backup:Backups", from: "ok", to: "ok", d: 1 })).toBeNull()
    expect(alertFor({ t: 1, id: "nonsense", from: "a", to: "b", d: 1 })).toBeNull()
  })

  it("publishes to the topic only when configured, and never throws", async () => {
    const calls: { url: string; init: RequestInit }[] = []
    const ok = (async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return new Response("{}")
    }) as unknown as typeof fetch
    const event = { t: 1, id: "svc:Jellyfin", from: "up", to: "down", d: 1 }

    expect(await sendAlerts([event], {}, ok)).toBe(0)
    expect(calls).toHaveLength(0)

    expect(
      await sendAlerts(
        [event],
        { NTFY_TOPIC: "lab-x", NTFY_URL: "https://ntfy.example/", NTFY_TOKEN: "tk" },
        ok,
      ),
    ).toBe(1)
    expect(calls[0].url).toBe("https://ntfy.example")
    expect((calls[0].init.headers as Record<string, string>).authorization).toBe("Bearer tk")
    expect(JSON.parse(String(calls[0].init.body))).toMatchObject({
      topic: "lab-x",
      title: "Jellyfin: down",
      click: "https://www.itsashik.dev/homecave",
    })

    const failing = (async () => {
      throw new Error("offline")
    }) as unknown as typeof fetch
    expect(await sendAlerts([event], { NTFY_TOPIC: "lab-x" }, failing)).toBe(0)
  })
})

describe("formatDuration", () => {
  it("uses one or two units", () => {
    expect(formatDuration(45)).toBe("45 sec")
    expect(formatDuration(720)).toBe("12 min")
    expect(formatDuration(3 * 3600 + 300)).toBe("3 hr 5 min")
    expect(formatDuration(3 * 3600)).toBe("3 hr")
    expect(formatDuration(2 * 86_400 + 4 * 3600)).toBe("2 days 4 hr")
    expect(formatDuration(-1)).toBe("—")
    expect(formatDuration(720, "de")).toBe("12 Min.")
  })
})
