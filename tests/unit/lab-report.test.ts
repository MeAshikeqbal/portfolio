import { describe, expect, it } from "vitest"
import type { LabEvent } from "@/lib/lab/incidents"
import {
  buildMonthlyReport,
  incidentText,
  isMonth,
  monthDays,
  previousMonth,
  reportPost,
  spokenDuration,
} from "@/lib/lab/report"
import type { LabRecordRaw } from "@/lib/lab/store"

const at = (iso: string) => Date.parse(iso) / 1000
const ev = (t: number, id: string, from: string, to: string, d: number): LabEvent => ({
  t,
  id,
  from,
  to,
  d,
})

/** Full days for every entity, with some samples down on given days. */
function record(
  days: string[],
  { down = {}, from = 0 }: { down?: Record<string, Record<number, number>>; from?: number } = {},
  events: LabEvent[] = [],
  states: LabRecordRaw["states"] = {},
): LabRecordRaw {
  const ids = [
    "node:Tower",
    "node:Mini PC #1",
    "wan:Internet",
    "svc:Frigate",
    "svc:Jellyfin",
    "svc:Tdarr",
  ]
  return {
    states,
    events,
    rollups: days.map((_, i) => {
      if (i < from) return {}
      const hash: Record<string, string> = {}
      for (const id of ids) {
        hash[`${id}:n`] = "288"
        hash[`${id}:u`] = String(288 - (down[id]?.[i] ?? 0))
      }
      return hash
    }),
  }
}

describe("months", () => {
  it("lists every UTC day of a month, leap years included", () => {
    expect(monthDays("2026-11")).toHaveLength(30)
    expect(monthDays("2026-11")[0]).toBe("2026-11-01")
    expect(monthDays("2026-12").at(-1)).toBe("2026-12-31")
    expect(monthDays("2028-02")).toHaveLength(29)
  })

  it("finds the month before, across a year end", () => {
    expect(previousMonth(new Date("2026-12-01T06:00:00Z"))).toBe("2026-11")
    expect(previousMonth(new Date("2027-01-01T06:00:00Z"))).toBe("2026-12")
  })

  it("accepts only YYYY-MM", () => {
    expect(isMonth("2026-11")).toBe(true)
    for (const bad of ["2026-13", "2026-1", "26-11", "", null]) expect(isMonth(bad)).toBe(false)
  })
})

describe("buildMonthlyReport", () => {
  const month = "2026-10"
  const days = monthDays(month)

  it("sums uptime over the month: machines and the internet line, then services worst first", () => {
    const report = buildMonthlyReport({
      month,
      record: record(days, {
        down: { "node:Tower": { 3: 4 }, "svc:Frigate": { 10: 48 }, "svc:Tdarr": { 2: 1 } },
      }),
      changes: [],
      writeups: [],
    })
    expect(report.coveredDays).toBe(31)
    expect(report.startedOn).toBeNull()
    expect(report.machines.map((m) => [m.name, m.pct, m.downS])).toEqual([
      ["Mini PC #1", 100, 0],
      ["Tower", 99.9, 1200],
      ["Internet", 100, 0],
    ])
    expect(report.services.map((s) => s.name)).toEqual(["Frigate", "Tdarr", "Jellyfin"])
    expect(report.services[0].downS).toBe(48 * 300)
  })

  it("says when recording began partway through the month", () => {
    const report = buildMonthlyReport({
      month,
      record: record(days, { from: 15 }),
      changes: [],
      writeups: [],
    })
    expect(report.startedOn).toBe("2026-10-16")
    expect(report.coveredDays).toBe(16)
  })

  it("keeps incidents that overlap the month, from its first day, oldest first", () => {
    const report = buildMonthlyReport({
      month,
      record: record(
        days,
        {},
        [
          // Recovered on Nov 2: began in October, so it counts.
          ev(at("2026-11-02T01:00:00Z"), "svc:Frigate", "down", "up", 2 * 86_400),
          ev(at("2026-10-15T12:00:00Z"), "node:Tower", "up", "nodata", 600),
          // The very start of a 31-day month, more than 30 days before its end.
          ev(at("2026-10-01T00:30:00Z"), "wan:Internet", "down", "up", 1800),
          // Entirely in September.
          ev(at("2026-09-20T00:00:00Z"), "svc:Jellyfin", "down", "up", 60),
        ],
        {
          "pool:Tower/Bulk storage": {
            state: "DEGRADED",
            since: at("2026-10-30T10:00:00Z"),
            seen: at("2026-11-01T05:59:00Z"),
          },
          // Went bad after the month ended: next month's news.
          "svc:Tdarr": {
            state: "down",
            since: at("2026-11-01T02:00:00Z"),
            seen: at("2026-11-01T05:59:00Z"),
          },
        },
      ),
      changes: [],
      writeups: [{ title: "Tower went quiet", slug: "tower-quiet", incident: "2026-10-15" }],
    })
    expect(report.incidents.map((i) => [i.name, i.state, i.end === null])).toEqual([
      ["Internet", "down", false],
      ["Tower", "nodata", false],
      ["Bulk storage", "DEGRADED", true],
      ["Frigate", "down", false],
    ])
    expect(report.incidents[1].writeup?.slug).toBe("tower-quiet")
    expect(report.incidents[0].writeup).toBeNull()
  })

  it("keeps only the month's changes, in date order", () => {
    const report = buildMonthlyReport({
      month,
      record: record(days),
      changes: [
        { date: "2026-10-20", title: "Second" },
        { date: "2026-09-30", title: "Before" },
        { date: "2026-10-02", title: "First", category: "storage", note: "Mirror added." },
      ],
      writeups: [],
    })
    expect(report.changes.map((c) => c.title)).toEqual(["First", "Second"])
  })
})

describe("reportPost", () => {
  const month = "2026-10"
  const days = monthDays(month)
  const text = (post: ReturnType<typeof reportPost>) =>
    post.body
      .map((b) =>
        "children" in b ? b.children.map((c) => c.text).join("") : `${b.title}: ${b.text}`,
      )
      .join("\n")

  it("drafts a titled post with every section, from a quiet month", () => {
    const post = reportPost(
      buildMonthlyReport({ month, record: record(days), changes: [], writeups: [] }),
      new Date("2026-11-01T06:00:00Z"),
    )
    expect(post.title).toBe("Lab report: October 2026")
    expect(post.slug).toBe("lab-report-2026-10")
    const body = text(post)
    expect(body).toContain("Generated on Nov 1 from Homecave's uptime samples")
    expect(body).toContain("In October, the lab logged 0 incidents and 0 planned changes.")
    expect(body).toContain("Tower: 100%")
    expect(body).toContain("Internet line: 100%")
    expect(body).toContain("All 3 services stayed up the whole time.")
    expect(body).toContain("Nothing went wrong.")
    expect(body).toContain("No planned changes.")
    // Keys are unique within the body and inside each block.
    const keys = post.body.flatMap((b) => [
      b._key,
      ...("children" in b ? b.children.map((c) => c._key) : []),
    ])
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("lists downtime, incidents with their write-ups, and changes", () => {
    const report = buildMonthlyReport({
      month,
      record: record(days, { down: { "svc:Frigate": { 20: 47 } }, from: 15 }, [
        ev(at("2026-10-15T12:00:00Z"), "node:Tower", "up", "nodata", 600),
      ]),
      changes: [
        {
          date: "2026-10-02",
          title: "Added a mirror.",
          category: "storage",
          note: "Two disks now.",
        },
      ],
      writeups: [{ title: "Tower went quiet", slug: "tower-quiet", incident: "2026-10-15" }],
    })
    const post = reportPost(report, new Date("2026-11-01T06:00:00Z"))
    const body = text(post)
    expect(body).toContain(
      "Recording began on Oct 16, so the numbers cover 16 of the month's 31 days.",
    )
    expect(body).toContain("Services with downtime, worst first (the other 2 stayed up):")
    expect(body).toContain("Frigate: 98.9% (about 3 hr 55 min down)")
    expect(body).toContain(
      "Oct 15, 12:00 UTC: No data from Tower, 10 min (written up in Tower went quiet).",
    )
    expect(body).toContain("Oct 2 · storage: Added a mirror. Two disks now.")
    const linked = post.body.find((b) => "markDefs" in b && b.markDefs.length > 0)
    expect(linked && "markDefs" in linked && linked.markDefs[0].href).toBe("/post/tower-quiet")
  })
})

describe("wording", () => {
  it("rounds durations the way people say them", () => {
    expect(spokenDuration(20)).toBe("1 min")
    expect(spokenDuration(45 * 60)).toBe("45 min")
    expect(spokenDuration(3 * 3600 + 300)).toBe("3 hr 5 min")
    expect(spokenDuration(52 * 3600)).toBe("2 days 4 hr")
  })

  it("names each kind of incident like the log does", () => {
    const base = { start: 0, end: 1 }
    expect(incidentText({ ...base, kind: "node", name: "Tower", state: "nodata" })).toBe(
      "No data from Tower",
    )
    expect(incidentText({ ...base, kind: "svc", name: "Frigate", state: "down" })).toBe(
      "Frigate down",
    )
    expect(
      incidentText({ ...base, kind: "pool", name: "Bulk", node: "Tower", state: "DEGRADED" }),
    ).toBe("Bulk on Tower: degraded")
    expect(incidentText({ ...base, kind: "backup", name: "Backups", state: "failed" })).toBe(
      "Backups failed",
    )
    expect(incidentText({ ...base, kind: "wan", name: "Internet", state: "down" })).toBe(
      "Internet down",
    )
  })
})
