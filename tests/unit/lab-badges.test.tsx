import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { LabNodeBadgeView, LabSummaryView } from "@/components/lab/lab-badges"

const now = new Date("2026-11-10T12:00:00Z")
const status = (minutesAgo: number) => ({
  nodes: [
    { name: "Tower", online: true, uptime: 90_000 },
    { name: "Mini PC #2", online: false, uptime: 0 },
  ],
  receivedAt: new Date(now.getTime() - minutesAgo * 60_000).toISOString(),
})

describe("lab badges", () => {
  it("shows measured state as a coloured word", () => {
    render(<LabNodeBadgeView name="Tower" status={status(2)} now={now} />)
    expect(screen.getByText("up · 1d")).toHaveClass("text-status-up-fg")
  })
  it("shows down in red and stale data as grey 'no data'", () => {
    const { rerender } = render(<LabNodeBadgeView name="Mini PC #2" status={status(2)} now={now} />)
    expect(screen.getByText("down")).toHaveClass("text-status-down-fg")
    rerender(<LabNodeBadgeView name="Tower" status={status(45)} now={now} />)
    expect(screen.getByText("no data")).toHaveClass("text-status-idle-fg")
  })
  it("claims nothing for unknown machines or before any heartbeat", () => {
    const { container } = render(<LabNodeBadgeView name="Storage" status={status(2)} now={now} />)
    expect(container).toBeEmptyDOMElement()
    const { container: none } = render(<LabSummaryView status={null} now={now} />)
    expect(none).toBeEmptyDOMElement()
  })
  it("summarises with attention when some machines are down", () => {
    render(<LabSummaryView status={status(2)} now={now} />)
    expect(screen.getByText("1/2 up")).toHaveClass("text-status-warn-fg")
  })
})
