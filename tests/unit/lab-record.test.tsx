import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { LabRecord } from "@/components/homecave/lab-record"
import { lastDays, type LabReliability } from "@/lib/lab/incidents"

const now = new Date("2026-11-16T12:00:00Z")
const nowS = now.getTime() / 1000
const days = lastDays(now)
const full = { up: 288, total: 288 }
/** 90 slots: nothing before the last `n` days, then `day` (or full days). */
const recent = (n: number, last = full) =>
  days.map((_, i) => (i < days.length - n ? null : i === days.length - 1 ? last : full))

const record: LabReliability = {
  days,
  incidents: [
    {
      kind: "pool",
      node: "Tower",
      name: "Bulk storage",
      state: "DEGRADED",
      start: nowS - 7200,
      end: null,
    },
    { kind: "svc", name: "Jellyfin", state: "down", start: nowS - 9000, end: nowS - 8700 },
    { kind: "node", name: "Mini PC #2", state: "nodata", start: nowS - 90_000, end: nowS - 89_280 },
  ],
  uptime: [
    { kind: "node", name: "Tower", days: recent(3), pct: 100 },
    { kind: "wan", name: "Internet", days: recent(3, { up: 280, total: 288 }), pct: 99.1 },
    { kind: "svc", name: "Jellyfin", days: recent(3, { up: 100, total: 288 }), pct: 92.5 },
  ],
}

describe("Homecave track record", () => {
  it("draws 90 days of bars per machine, with services folded away", () => {
    render(<LabRecord record={record} changes={[]} writeups={[]} now={now} />)
    expect(screen.getByRole("heading", { name: "uptime · 90 days" })).toBeVisible()
    expect(screen.getByText("recorded since Nov 14, 2026")).toBeVisible()
    const tower = screen.getByRole("img", { name: "Tower: 100% uptime over the days shown" })
    expect(tower.children).toHaveLength(90)
    expect(tower.lastElementChild).toHaveAttribute("title", "Nov 16, 2026: no downtime")
    expect(tower.firstElementChild).toHaveAttribute("title", "Aug 19, 2026: no data")
    // The WAN row is named in the reader's language; its partial day says how much.
    const internet = screen.getByRole("img", { name: "Internet: 99.1% uptime over the days shown" })
    expect(internet.lastElementChild).toHaveAttribute(
      "title",
      "Nov 16, 2026: some downtime, 97.2% uptime",
    )
    expect(screen.getByText("1 service")).toBeVisible()
    expect(screen.getByText("· 1 with downtime")).toBeVisible()
  })

  it("logs incidents in plain words, ongoing first, linked to their write-up", () => {
    render(
      <LabRecord
        record={record}
        changes={[]}
        writeups={[{ title: "Fixing Jellyfin", slug: "fixing-jellyfin", incident: "2026-11-16" }]}
        now={now}
      />,
    )
    const log = screen.getByRole("region", { name: "log" })
    const rows = within(log).getAllByRole("listitem")
    expect(rows.map((r) => r.querySelector(".font-medium")?.textContent)).toEqual([
      "Bulk storage on Tower: DEGRADED",
      "Jellyfin down",
      "No data from Mini PC #2",
    ])
    expect(within(rows[0]).getAllByText("ongoing")[0]).toBeVisible()
    expect(within(rows[0]).getAllByText("2 hr so far")[0]).toBeVisible()
    expect(within(rows[1]).getAllByText("resolved")[0]).toBeVisible()
    expect(within(rows[1]).getAllByText("5 min")[0]).toBeVisible()
    expect(within(rows[1]).getAllByText("Nov 16 09:30 UTC")[0]).toBeVisible()
    // Both incidents of Nov 16 are within a day of the post's date; Mini PC #2's is too.
    expect(
      within(rows[1]).getByRole("link", { name: "Read the write-up: Fixing Jellyfin" }),
    ).toHaveAttribute("href", "/post/fixing-jellyfin")
  })

  it("says when logging began rather than implying a clean month", () => {
    render(<LabRecord record={{ ...record, incidents: [] }} changes={[]} writeups={[]} now={now} />)
    expect(
      screen.getByText("Nothing has gone wrong since logging began on Nov 14, 2026."),
    ).toBeVisible()
  })

  it("explains empty bars before the first samples", () => {
    render(
      <LabRecord
        record={{ days, incidents: [], uptime: [] }}
        changes={[]}
        writeups={[]}
        now={now}
      />,
    )
    expect(screen.getByText(/first bars appear once the lab has reported/)).toBeVisible()
    expect(screen.getByText("Nothing has gone wrong in the last 30 days.")).toBeVisible()
  })

  it("lists the changelog beside the log, and renders nothing with neither", () => {
    render(
      <LabRecord
        record={null}
        changes={[
          {
            _id: "c1",
            date: "2026-11-12",
            category: "storage",
            title: "Added a mirror disk",
            note: "Bulk storage is redundant now.",
          },
        ]}
        writeups={[]}
        now={now}
      />,
    )
    const changelog = screen.getByRole("region", { name: "changelog" })
    expect(within(changelog).getByText("Added a mirror disk")).toBeVisible()
    expect(within(changelog).getByText("Bulk storage is redundant now.")).toBeVisible()
    expect(within(changelog).getAllByText("storage")[0]).toBeVisible()
    expect(screen.queryByRole("region", { name: "log" })).toBeNull()

    const { container } = render(<LabRecord record={null} changes={[]} writeups={[]} now={now} />)
    expect(container).toBeEmptyDOMElement()
  })
})
