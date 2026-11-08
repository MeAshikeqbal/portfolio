import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { DataList, DataRow } from "@/components/dashboard/data-list"
import { Sparkline, sparklinePoints } from "@/components/dashboard/sparkline"
import { StatusDot } from "@/components/dashboard/status-dot"
import { StatusPill } from "@/components/dashboard/status-pill"
import { projectStatus } from "@/lib/status"

describe("projectStatus", () => {
  it.each([
    ["active", "up", "live"],
    ["maintained", "info", "maintained"],
    ["archived", "idle", "archived"],
  ])("maps %s to %s", (value, status, label) => {
    expect(projectStatus(value)).toEqual({ status, label })
  })

  it("claims nothing when the status is unset", () => {
    expect(projectStatus(null)).toBeNull()
    expect(projectStatus(undefined)).toBeNull()
  })
})

describe("StatusDot / StatusPill", () => {
  it("gives the dot a screen-reader label so colour is never the only signal", () => {
    render(<StatusDot status="down" label="Service down" />)
    expect(screen.getByText("Service down")).toHaveClass("sr-only")
  })

  it("only pulses when asked, and only for motion-safe users", () => {
    const { container } = render(<StatusDot status="up" pulse />)
    expect(container.querySelector(".motion-safe\\:animate-pulse-dot")).not.toBeNull()
  })

  it("renders a visible label in the pill", () => {
    render(<StatusPill status="up">live</StatusPill>)
    expect(screen.getByText("live")).toBeVisible()
  })
})

describe("Sparkline", () => {
  it("scales points into the box, with the max at the top and the min at the bottom", () => {
    const points = sparklinePoints([0, 10], 100, 20, 0)
    expect(points).toEqual([
      { x: 0, y: 20 },
      { x: 100, y: 0 },
    ])
  })

  it("draws a flat series at mid-height", () => {
    expect(sparklinePoints([5, 5, 5], 100, 20).every((p) => p.y === 10)).toBe(true)
  })

  it("summarises the trend for assistive tech", () => {
    render(<Sparkline values={[3, 9, 4, 12]} label="Commits per week" />)
    expect(screen.getByRole("img")).toHaveAccessibleName("Commits per week: from 3 to 12, peak 12")
  })

  it("renders nothing with fewer than two points", () => {
    const { container } = render(<Sparkline values={[4]} label="x" />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe("DataRow", () => {
  it("links the whole row and labels its status", () => {
    render(
      <DataList>
        <DataRow
          title="arogify"
          href="/projects/arogify"
          status={{ status: "up", label: "live" }}
          meta={["TypeScript"]}
        />
      </DataList>,
    )
    expect(screen.getByRole("link")).toHaveAttribute("href", "/projects/arogify")
    expect(screen.getByText("live")).toHaveClass("sr-only")
    // Meta renders twice: stacked for phones, inline for wider screens.
    expect(screen.getAllByText("TypeScript")).toHaveLength(2)
  })
})
