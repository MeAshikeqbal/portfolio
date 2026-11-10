import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { LabNodeBadgeView, LabSummaryView } from "@/components/lab/lab-badges"
import type { LabStatus } from "@/lib/lab/types"

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
const status: LabStatus = {
  nodes: [
    node("Tower", ago(10), { peers: [{ name: "Mini PC #2", online: false }] }),
    node("Mini PC #2", ago(900)),
    node("Mini PC #1", ago(900)),
  ],
}

describe("lab badges", () => {
  it("shows measured state as a coloured word", () => {
    render(<LabNodeBadgeView name="Tower" status={status} now={now} />)
    expect(screen.getByText("up · 1d")).toHaveClass("text-status-up-fg")
  })
  it("shows down in red (peers saw it offline) and silence as grey 'no data'", () => {
    const { rerender } = render(<LabNodeBadgeView name="Mini PC #2" status={status} now={now} />)
    expect(screen.getByText("down")).toHaveClass("text-status-down-fg")
    rerender(<LabNodeBadgeView name="Mini PC #1" status={status} now={now} />)
    expect(screen.getByText("no data")).toHaveClass("text-status-idle-fg")
  })
  it("claims nothing for unknown machines or before any heartbeat", () => {
    const { container } = render(<LabNodeBadgeView name="Storage" status={status} now={now} />)
    expect(container).toBeEmptyDOMElement()
    const { container: none } = render(<LabSummaryView status={null} now={now} />)
    expect(none).toBeEmptyDOMElement()
  })
  it("summarises with attention when some machines are down", () => {
    render(<LabSummaryView status={status} now={now} />)
    expect(screen.getByText("1/3 up")).toHaveClass("text-status-warn-fg")
  })
})
