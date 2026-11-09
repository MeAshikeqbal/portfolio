import { render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import NowPage from "@/app/(root)/now/page"
import UsesPage from "@/app/(root)/uses/page"
import { NowView } from "@/components/about/now-view"
import { UsesView } from "@/components/about/uses-view"
import { getNow, getUses } from "@/lib/api"
import type { NOW_QUERY_RESULT, USES_QUERY_RESULT } from "@/sanity.types"

vi.mock("@/lib/api", () => ({ getUses: vi.fn(), getNow: vi.fn() }))
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND")
  },
}))

type Uses = NonNullable<USES_QUERY_RESULT>
type Now = NonNullable<NOW_QUERY_RESULT>

const paragraph = (text: string) => ({
  _type: "block" as const,
  _key: text.slice(0, 8),
  style: "normal" as const,
  markDefs: [],
  children: [{ _type: "span" as const, _key: "s", text, marks: [] }],
})

describe("UsesView", () => {
  it("renders sections and items, linking items that have a URL", () => {
    render(
      <UsesView
        uses={{
          _updatedAt: "2026-11-01T00:00:00Z",
          intro: "My setup.",
          sections: [
            {
              _key: "s1",
              title: "Homelab",
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
        }}
      />,
    )
    expect(screen.getByRole("heading", { level: 1, name: "Uses" })).toBeVisible()
    expect(screen.getByText("My setup.")).toBeVisible()
    expect(screen.getByText("Nov 1, 2026", { exact: false })).toBeVisible()
    expect(screen.getByRole("link", { name: /Proxmox/ })).toHaveAttribute(
      "href",
      "https://proxmox.com",
    )
    expect(screen.getByText("Raspberry Pi").tagName).toBe("P")
    // Empty sections are skipped.
    expect(screen.queryByText("Empty section")).toBeNull()
  })
})

describe("NowView", () => {
  it("renders the update with its date and location", () => {
    render(
      <NowView
        now={{
          _updatedAt: "2026-11-09T00:00:00Z",
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
    expect(screen.getByText(/updated Nov 9, 2026/)).toBeVisible()
    expect(screen.getByText("Kolkata")).toBeVisible()
    expect(within(screen.getByRole("article")).getByText("Rebuilding my homelab.")).toBeVisible()
  })
})

describe("UsesView with malformed content", () => {
  const base: Uses = { _updatedAt: "2026-11-01T00:00:00Z", intro: null, sections: [] }

  it("drops nameless items and sections left empty", () => {
    render(
      <UsesView
        uses={{
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
        }}
      />,
    )
    expect(screen.getByText("Keyboard")).toBeVisible()
    expect(screen.getByText("1 items")).toBeVisible()
    expect(screen.queryByText("blank")).toBeNull()
    expect(screen.queryByText("Only nameless")).toBeNull()
    expect(screen.queryByText("Null items")).toBeNull()
  })

  it("renders an unknown icon without crashing", () => {
    render(
      <UsesView
        uses={{
          ...base,
          sections: [
            {
              _key: "s",
              title: "Homelab",
              items: [
                { _key: "i", name: "Box", description: null, url: null, icon: "nope:missing" },
              ],
            },
          ],
        }}
      />,
    )
    expect(screen.getByText("Box")).toBeVisible()
  })

  it.each([null, "not a date"])("hides the date when _updatedAt is %s", (updatedAt) => {
    render(
      <UsesView
        uses={{
          ...base,
          _updatedAt: updatedAt as string,
          sections: [
            {
              _key: "s",
              title: "Desk",
              items: [{ _key: "i", name: "Mouse", description: null, url: null, icon: null }],
            },
          ],
        }}
      />,
    )
    expect(screen.queryByText(/last updated/)).toBeNull()
    expect(screen.queryByText(/Invalid Date/)).toBeNull()
  })
})

describe("NowView edge cases", () => {
  const now: Now = {
    _updatedAt: "2026-11-01T00:00:00Z",
    location: null,
    body: [paragraph("Building things.")],
  }

  it("shows a fresh update in the info state", () => {
    render(<NowView now={now} today={new Date("2026-11-09T00:00:00Z")} />)
    const pill = screen.getByText(/updated Nov 1, 2026/)
    expect(pill).not.toHaveTextContent("stale")
  })

  it("marks an update older than 90 days as stale", () => {
    render(<NowView now={now} today={new Date("2027-03-01T00:00:00Z")} />)
    expect(screen.getByText(/updated Nov 1, 2026/)).toHaveTextContent("· stale")
  })

  it.each([null, "garbage"])("hides the date when _updatedAt is %s", (updatedAt) => {
    render(<NowView now={{ ...now, _updatedAt: updatedAt as string }} />)
    expect(screen.queryByText(/updated/)).toBeNull()
    expect(screen.queryByText(/Invalid Date/)).toBeNull()
  })

  it("shows no location without one", () => {
    const { container } = render(<NowView now={{ ...now, location: "  " }} />)
    expect(container.querySelector(".lucide-map-pin")).toBeNull()
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

describe("the /uses and /now pages", () => {
  beforeEach(() => {
    vi.mocked(getUses).mockReset()
    vi.mocked(getNow).mockReset()
  })

  it.each([
    ["unpublished", null],
    ["without sections", { _updatedAt: "2026-11-01T00:00:00Z", intro: null, sections: null }],
    [
      "with only empty sections",
      {
        _updatedAt: "2026-11-01T00:00:00Z",
        intro: null,
        sections: [
          { _key: "a", title: "Empty", items: [] },
          { _key: "b", title: "Null", items: null },
          {
            _key: "c",
            title: "Nameless",
            items: [{ _key: "i", name: null, description: null, url: null, icon: null }],
          },
        ],
      },
    ],
  ])("/uses 404s when %s", async (_, uses) => {
    vi.mocked(getUses).mockResolvedValue(uses as USES_QUERY_RESULT)
    await expect(UsesPage()).rejects.toThrow("NEXT_NOT_FOUND")
  })

  it("/uses renders once a section has a named item", async () => {
    vi.mocked(getUses).mockResolvedValue({
      _updatedAt: "2026-11-01T00:00:00Z",
      intro: null,
      sections: [
        {
          _key: "a",
          title: "Desk",
          items: [{ _key: "i", name: "Mouse", description: null, url: null, icon: null }],
        },
      ],
    })
    render(await UsesPage())
    expect(screen.getByText("Mouse")).toBeVisible()
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
