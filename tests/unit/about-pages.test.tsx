import { render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import NowPage from "@/app/(root)/now/page"
import { NowView } from "@/components/about/now-view"
import { UsesSections, visibleUsesSections } from "@/components/about/uses-view"
import { getNow } from "@/lib/api"
import type { NOW_QUERY_RESULT, USES_QUERY_RESULT } from "@/sanity.types"

vi.mock("@/lib/api", () => ({ getNow: vi.fn() }))
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND")
  },
}))

type Uses = NonNullable<USES_QUERY_RESULT>
type Now = NonNullable<NOW_QUERY_RESULT>

/** The meta line's "updated <date>" item (the date is its own <time>). */
const updatedItem = (date: string) => {
  const item = screen.getByText(date, { selector: "time" }).parentElement!
  expect(item).toHaveTextContent(`updated ${date}`)
  return item
}

const paragraph = (text: string) => ({
  _type: "block" as const,
  _key: text.slice(0, 8),
  style: "normal" as const,
  markDefs: [],
  children: [{ _type: "span" as const, _key: "s", text, marks: [] }],
})

describe("UsesSections", () => {
  it("renders sections and items, linking items that have a URL", () => {
    const sections = visibleUsesSections({
      _updatedAt: "2026-11-01T00:00:00Z",
      intro: "My setup.",
      sections: [
        {
          _key: "s1",
          title: "Self-hosted",
          items: [
            {
              _key: "i1",
              name: "Proxmox",
              description: "Hypervisor",
              url: "https://proxmox.com",
              icon: "simple-icons:proxmox",
            },
            { _key: "i2", name: "Raspberry Pi", description: null, url: null, icon: null },
          ],
        },
        { _key: "s2", title: "Empty section", items: [] },
      ],
    })
    render(<UsesSections sections={sections} badge={(name) => <span>badge:{name}</span>} />)
    expect(screen.getByRole("link", { name: /Proxmox/ })).toHaveAttribute(
      "href",
      "https://proxmox.com",
    )
    expect(screen.getByText("Raspberry Pi").tagName).toBe("P")
    expect(screen.getByText("badge:Raspberry Pi")).toBeVisible()
    // Empty sections are skipped.
    expect(screen.queryByText("Empty section")).toBeNull()
  })
})

describe("NowView", () => {
  it("renders the update with its date and location", () => {
    render(
      <NowView
        now={{
          _updatedAt: "2026-11-10T08:00:00Z",
          updated: "2026-11-09",
          archive: null,
          location: "Kolkata",
          body: [
            {
              _type: "block",
              _key: "b1",
              style: "normal",
              markDefs: [],
              children: [{ _type: "span", _key: "c1", text: "Rebuilding my homelab.", marks: [] }],
            },
          ],
        }}
      />,
    )
    expect(screen.getByRole("heading", { level: 1, name: "Now" })).toBeVisible()
    // The date the update was written, not the last edit.
    expect(updatedItem("Nov 9, 2026")).toBeVisible()
    expect(screen.getByText("Kolkata")).toBeVisible()
    expect(within(screen.getByRole("article")).getByText("Rebuilding my homelab.")).toBeVisible()
    expect(screen.getByRole("link", { name: "now page" })).toHaveAttribute(
      "href",
      "https://nownownow.com/about",
    )
    // No history yet: no section for it.
    expect(screen.queryByRole("heading", { name: "Previous updates" })).toBeNull()
  })

  it("lists previous updates newest first, each opening to its full text", () => {
    render(
      <NowView
        now={{
          _updatedAt: "2026-11-10T08:00:00Z",
          updated: "2026-11-10",
          location: null,
          body: [paragraph("The current update.")],
          archive: [
            { _key: "b", date: "2026-08-01", location: "Kolkata", body: [paragraph("Summer.")] },
            { _key: "a", date: "2026-03-01", location: null, body: [paragraph("Spring.")] },
            // Incomplete entries never render.
            { _key: "x", date: null, location: null, body: [paragraph("Undated.")] },
            { _key: "y", date: "2026-01-01", location: null, body: [] },
          ],
        }}
      />,
    )
    const history = screen.getByRole("region", { name: "Previous updates" })
    const items = within(history).getAllByRole("listitem")
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent("Aug 1, 2026")
    expect(items[1]).toHaveTextContent("Mar 1, 2026")
    expect(items[0].querySelector("details")).not.toHaveAttribute("open")
    expect(within(items[0]).getAllByText("Summer.").length).toBeGreaterThan(0)
    expect(within(items[0]).getByText("Kolkata")).toBeInTheDocument()
    expect(screen.queryByText("Undated.")).toBeNull()
  })
})

describe("UsesSections with malformed content", () => {
  const base: Uses = { _updatedAt: "2026-11-01T00:00:00Z", intro: null, sections: [] }

  it("drops nameless items and sections left empty", () => {
    const sections = visibleUsesSections({
      ...base,
      sections: [
        {
          _key: "s1",
          title: "Desk",
          items: [
            { _key: "a", name: "Keyboard", description: null, url: null, icon: null },
            { _key: "b", name: "  ", description: "blank", url: null, icon: null },
            { _key: "c", name: null, description: "missing", url: null, icon: null },
          ],
        },
        {
          _key: "s2",
          title: "Only nameless",
          items: [{ _key: "d", name: null, description: null, url: null, icon: null }],
        },
        { _key: "s3", title: "Null items", items: null },
      ],
    })
    render(<UsesSections sections={sections} />)
    expect(screen.getByText("Keyboard")).toBeVisible()
    expect(screen.getByText("1 items")).toBeVisible()
    expect(screen.queryByText("blank")).toBeNull()
    expect(screen.queryByText("Only nameless")).toBeNull()
    expect(screen.queryByText("Null items")).toBeNull()
  })

  it("renders an unknown icon without crashing", () => {
    const sections = visibleUsesSections({
      ...base,
      sections: [
        {
          _key: "s",
          title: "Network",
          items: [{ _key: "i", name: "Box", description: null, url: null, icon: "nope:missing" }],
        },
      ],
    })
    render(<UsesSections sections={sections} />)
    expect(screen.getByText("Box")).toBeVisible()
  })

  it("treats null content as no sections", () => {
    expect(visibleUsesSections(null)).toEqual([])
    expect(visibleUsesSections({ ...base, sections: null })).toEqual([])
  })
})

describe("NowView edge cases", () => {
  const now: Now = {
    _updatedAt: "2026-11-05T00:00:00Z",
    updated: "2026-11-01T00:00:00Z",
    archive: null,
    location: null,
    body: [paragraph("Building things.")],
  }

  it("says nothing about freshness while the update is recent", () => {
    render(<NowView now={now} today={new Date("2026-11-09T00:00:00Z")} />)
    expect(updatedItem("Nov 1, 2026")).toBeVisible()
    expect(screen.queryByText("stale")).toBeNull()
  })

  it("leads with a stale mark, in warn colour, once the update is older than 90 days", () => {
    render(<NowView now={now} today={new Date("2027-03-01T00:00:00Z")} />)
    const mark = screen.getByText("stale")
    expect(mark).toHaveClass("text-status-warn-fg")
    expect(mark.parentElement?.firstElementChild).toBe(mark)
  })

  it.each([null, "garbage"])("hides the date when updated is %s", (updated) => {
    render(<NowView now={{ ...now, updated: updated as string }} />)
    expect(screen.queryByText(/updated/)).toBeNull()
    expect(screen.queryByText(/Invalid Date/)).toBeNull()
  })

  it("shows no location without one", () => {
    render(<NowView now={{ ...now, location: "  " }} />)
    // The meta line holds only the date.
    expect(updatedItem("Nov 1, 2026").parentElement?.children).toHaveLength(1)
  })

  it("ignores unknown block types in the body", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    render(
      <NowView
        now={{
          ...now,
          body: [
            paragraph("Still renders."),
            { _type: "mysteryBlock", _key: "m" } as unknown as NonNullable<Now["body"]>[number],
          ],
        }}
      />,
    )
    expect(screen.getByText("Still renders.")).toBeVisible()
  })
})

describe("the /now page", () => {
  beforeEach(() => {
    vi.mocked(getNow).mockReset()
  })

  it.each([
    ["unpublished", null],
    ["with a null body", { _updatedAt: "2026-11-01T00:00:00Z", location: null, body: null }],
    ["with an empty body", { _updatedAt: "2026-11-01T00:00:00Z", location: null, body: [] }],
  ])("/now 404s when %s", async (_, now) => {
    vi.mocked(getNow).mockResolvedValue(now as NOW_QUERY_RESULT)
    await expect(NowPage()).rejects.toThrow("NEXT_NOT_FOUND")
  })
})
