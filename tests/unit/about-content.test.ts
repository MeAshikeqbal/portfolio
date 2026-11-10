import { describe, expect, it, vi } from "vitest"
import { NOW, USES } from "@/scripts/about-content.data"
import {
  HOMELAB_DESCRIPTION_MAX,
  HOMELAB_ITEMS,
  validateAboutContent,
  type AboutContent,
} from "@/scripts/about-content.validate"

// Validation loads whole icon sets (several MB of JSON); under the full parallel suite that
// can take longer than the default 5s.
vi.setConfig({ testTimeout: 30_000 })

const content: AboutContent = { uses: USES, now: NOW }

/** A deep copy of the seed content with one change applied. */
function variant(change: (draft: AboutContent) => void): AboutContent {
  const draft = structuredClone(content)
  change(draft)
  return draft
}

describe("Homecave and /now seed content", () => {
  it("passes every publishing check", async () => {
    expect(await validateAboutContent(content)).toEqual([])
  })

  it("leads with a five-item Homelab section that fits the hero", () => {
    const [homelab] = USES.sections
    expect(homelab.title).toMatch(/^homelab/i)
    expect(homelab.items).toHaveLength(HOMELAB_ITEMS)
    for (const item of homelab.items) {
      expect(item.description?.length ?? 0).toBeLessThanOrEqual(HOMELAB_DESCRIPTION_MAX)
    }
  })

  it("doesn't claim storage redundancy", () => {
    const storage = USES.sections[0].items.find((item) => item._key === "storage")
    expect(storage?.description).not.toMatch(/mirror|raid|parity|redundan/i)
  })

  it("follows nownownow (says what's not being done) and leaves Reading out", () => {
    const text = NOW.body.map((block) => block.children.map((c) => c.text).join("")).join("\n")
    expect(text).toMatch(/Not doing:/)
    expect(text).not.toMatch(/Reading:/)
  })

  it("keeps the first /now as history, older than the current update", () => {
    expect(NOW.archive.map((entry) => entry.date)).toEqual(["2026-11-09"])
    expect(NOW.archive[0].date < NOW.updatedOn).toBe(true)
  })
})

describe("validateAboutContent", () => {
  it.each([
    ["an IP address", "Proxy at 192.168.1.10"],
    ["a port", "Dashboard on host:8006"],
    ["a node hostname", "Runs on pve-1"],
    ["a private DNS suffix", "jellyfin.lan"],
    ["a version number", "Traefik v3.7"],
    ["a semver", "Proxmox 9.2.21"],
    ["a security control", "Traefik + CrowdSec"],
    ["a private project", "producr stack"],
    ["a camera detail", "Four cameras on the porch"],
    ["an unlisted domain", "Served from media.example.com"],
    ["a TODO", "TODO: fill in"],
  ])("rejects %s", async (_, description) => {
    const problems = await validateAboutContent(
      variant((draft) => {
        draft.uses.sections[1].items[0].description = description
      }),
    )
    expect(problems.length).toBeGreaterThan(0)
  })

  it("allows the site's own domain", async () => {
    expect(await validateAboutContent(content)).toEqual([])
    expect(JSON.stringify(USES)).toContain("itsashik.dev")
  })

  it("rejects links on homelab items", async () => {
    const problems = await validateAboutContent(
      variant((draft) => {
        draft.uses.sections[0].items[0].url = "https://www.proxmox.com"
      }),
    )
    expect(problems).toContainEqual(expect.stringMatching(/must not carry URLs/))
  })

  it("rejects icons the site can't serve", async () => {
    const problems = await validateAboutContent(
      variant((draft) => {
        draft.uses.sections[2].items[0].icon = "simple-icons:not-a-real-icon"
      }),
    )
    expect(problems).toContainEqual(expect.stringMatching(/isn't in a bundled set/))
  })

  it("rejects a Homelab section the hero can't use", async () => {
    const reordered = await validateAboutContent(
      variant((draft) => {
        draft.uses.sections.reverse()
      }),
    )
    expect(reordered).toContainEqual(expect.stringMatching(/first section must be titled/))

    const long = await validateAboutContent(
      variant((draft) => {
        draft.uses.sections[0].items[0].description = "x".repeat(HOMELAB_DESCRIPTION_MAX + 1)
      }),
    )
    expect(long).toContainEqual(expect.stringMatching(/max 45/))

    const short = await validateAboutContent(
      variant((draft) => {
        draft.uses.sections[0].items.pop()
      }),
    )
    expect(short).toContainEqual(expect.stringMatching(/the hero shows 5/))
  })

  it("rejects duplicate keys, empty sections and an empty /now", async () => {
    const problems = await validateAboutContent(
      variant((draft) => {
        draft.uses.sections[3].items[1]._key = draft.uses.sections[3].items[0]._key
        draft.uses.sections[4].items = []
        draft.now.body = []
      }),
    )
    expect(problems).toContainEqual(expect.stringMatching(/duplicate item _key/))
    expect(problems).toContainEqual(expect.stringMatching(/has no items/))
    expect(problems).toContainEqual(expect.stringMatching(/now.body is empty/))
  })
})

describe("validateAboutContent edge cases from review", () => {
  it.each([
    ["a spaced port", "Dashboard :8006", true],
    ["a host port", "host:8006", true],
    ["a time", "Standup at 10:30", false],
    ["a label with a spaced number", "Note: 12 items", false],
  ])("port check: %s", async (_, description, rejected) => {
    const problems = await validateAboutContent(
      variant((draft) => {
        draft.uses.sections[1].items[0].description = description
      }),
    )
    expect(problems.some((p) => p.includes("port number"))).toBe(rejected)
  })

  it("checks /now link destinations", async () => {
    const problems = await validateAboutContent(
      variant((draft) => {
        draft.now.body[0].markDefs = [
          { _key: "l", _type: "link", href: "http://192.168.1.10:8006" },
        ]
      }),
    )
    expect(problems).toContainEqual(expect.stringMatching(/now\.where\.link: looks like a IPv4/))
  })

  it("forbids links in the first section even under another key", async () => {
    const problems = await validateAboutContent(
      variant((draft) => {
        draft.uses.sections[0]._key = "lab"
        draft.uses.sections[0].items[0].url = "https://itsashik.dev/x"
      }),
    )
    expect(problems).toContainEqual(expect.stringMatching(/must not carry URLs/))
  })

  it("rejects icon names with extra segments", async () => {
    const problems = await validateAboutContent(
      variant((draft) => {
        draft.uses.sections[3].items[0].icon = "mdi:server:extra"
      }),
    )
    expect(problems).toContainEqual(
      expect.stringMatching(/mdi:server:extra isn't in a bundled set/),
    )
  })
})
