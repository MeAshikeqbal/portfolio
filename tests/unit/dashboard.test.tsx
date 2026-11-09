import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { DataList, DataRow } from "@/components/dashboard/data-list"
import { Sparkline, sparklinePoints } from "@/components/dashboard/sparkline"
import { StatusDot } from "@/components/dashboard/status-dot"
import { StatusPill } from "@/components/dashboard/status-pill"
import { projectStatus } from "@/lib/status"

describe("projectStatus", () => {
  const now = new Date("2026-11-10T00:00:00Z")
  const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString()

  it.each([
    ["active", "up", "active"],
    ["maintained", "idle", "maintained"],
    ["archived", "idle", "archived"],
  ])("maps a recently pushed %s project to %s %s", (value, status, label) => {
    const project = { status: value, githubData: { pushedAt: daysAgo(10) } }
    expect(projectStatus(project, now)).toEqual({ status, label })
  })

  it("lets measured inactivity win over the CMS: no push for 180+ days is dormant", () => {
    for (const value of ["active", "maintained"]) {
      expect(projectStatus({ status: value, githubData: { pushedAt: daysAgo(181) } }, now)).toEqual(
        { status: "idle", label: "dormant" },
      )
      expect(
        projectStatus({ status: value, githubData: { pushedAt: daysAgo(179) } }, now)?.label,
      ).not.toBe("dormant")
    }
    // Archived stays archived, however old.
    expect(
      projectStatus({ status: "archived", githubData: { pushedAt: daysAgo(900) } }, now)?.label,
    ).toBe("archived")
  })

  it("falls back to the CMS when there is nothing measured", () => {
    expect(projectStatus({ status: "active", githubData: null }, now)?.label).toBe("active")
    expect(
      projectStatus({ status: "maintained", githubData: { pushedAt: "garbage" } }, now)?.label,
    ).toBe("maintained")
  })

  it("never uses the link/info blue for a project", () => {
    for (const value of ["active", "maintained", "archived"]) {
      expect(projectStatus({ status: value }, now)?.status).not.toBe("info")
    }
  })

  it("claims nothing when the status is unset", () => {
    expect(projectStatus({ status: null }, now)).toBeNull()
    expect(projectStatus({}, now)).toBeNull()
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
          status={{ status: "up", label: "active" }}
          meta={["TypeScript"]}
        />
      </DataList>,
    )
    expect(screen.getByRole("link")).toHaveAttribute("href", "/projects/arogify")
    // The status is a visible word in its status colour, first in the meta, never colour alone.
    const labels = screen.getAllByText("active")
    expect(labels).toHaveLength(2)
    for (const label of labels) {
      expect(label).not.toHaveClass("sr-only")
      expect(label).toHaveClass("text-status-up-fg")
    }
    // Meta renders twice: stacked for phones, inline for wider screens.
    expect(screen.getAllByText("TypeScript")).toHaveLength(2)
  })
})
