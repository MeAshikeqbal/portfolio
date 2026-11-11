// @vitest-environment node
import { describe, expect, it } from "vitest"

import type { LabStatus } from "@/lib/lab/types"
import { statuslineCells } from "@/sanity/components/statusline-logic"

const now = new Date("2026-11-10T12:00:00Z")
const ago = (s: number) => new Date(now.getTime() - s * 1000).toISOString()
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

describe("Studio statusline", () => {
  it("shows nothing it can't measure", () => {
    expect(statuslineCells({}, now)).toEqual([])
    expect(statuslineCells({ syncedAt: null, lab: null }, now)).toEqual([])
  })

  it("judges the GitHub sync against the clock", () => {
    const [fresh] = statuslineCells({ syncedAt: ago(2 * 3600) }, now)
    expect(fresh).toMatchObject({ key: "github", status: "up", label: "github · synced 2h ago" })
    const [stale] = statuslineCells({ syncedAt: ago(3 * 86_400) }, now)
    expect(stale).toMatchObject({ status: "warn", label: "github · stale 3d ago" })
  })

  it("summarises the lab, coloured only when something isn't up", () => {
    const allUp: LabStatus = { nodes: [node("Tower", ago(10)), node("Mini PC #1", ago(10))] }
    const [up] = statuslineCells({ lab: allUp }, now)
    expect(up).toMatchObject({ key: "lab", label: "lab · 2/2 up", status: undefined })
    expect(up.dots).toEqual([
      { status: "up", label: "Tower: up · 1d" },
      { status: "up", label: "Mini PC #1: up · 1d" },
    ])

    const oneDown: LabStatus = {
      nodes: [
        node("Tower", ago(10), { peers: [{ name: "Mini PC #2", online: false }] }),
        node("Mini PC #2", ago(900)),
      ],
    }
    const [down] = statuslineCells({ lab: oneDown }, now)
    expect(down).toMatchObject({ status: "warn", label: "lab · 1/2 up" })
    expect(down.dots?.[1]).toEqual({ status: "down", label: "Mini PC #2: down" })
  })

  it("counts unread messages and drafts; only unread gets a dot", () => {
    const cells = statuslineCells({ unread: 2, drafts: 1 }, now)
    expect(cells).toEqual([
      { key: "inbox", status: "info", label: "inbox · 2 unread", href: "/studio/inbox" },
      { key: "drafts", label: "1 draft" },
    ])
    const quiet = statuslineCells({ unread: 0, drafts: 3 }, now)
    expect(quiet[0].status).toBeUndefined()
    expect(quiet[1].label).toBe("3 drafts")
  })
})
