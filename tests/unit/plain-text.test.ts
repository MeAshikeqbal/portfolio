import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"
import { wantsText } from "@/proxy"
import {
  WIDTH,
  columns,
  commands,
  excerptLine,
  homecaveText,
  labLines,
  rule,
  wrap,
  wrapMarkdown,
} from "@/lib/plain-text"
import type { LabNodeStatus, LabStatus } from "@/lib/lab/types"
import { englishT } from "./intl"

const now = new Date("2026-11-17T12:00:00Z")
const history = { t: [], cpu: [], mem: [], netIn: [], netOut: [], temp: [], gpu: [], edge: [] }
const node = (name: string, ageS: number, extra: Partial<LabNodeStatus> = {}): LabNodeStatus => ({
  name,
  online: true,
  uptime: 86_400 * 12,
  interval: 30,
  receivedAt: new Date(now.getTime() - ageS * 1000).toISOString(),
  history,
  availability24h: 100,
  cpu: { pct: 7.4, model: null, cores: 6, threads: 12 },
  mem: { pct: 61, totalGiB: 16 },
  ...extra,
})

describe("layout", () => {
  it("wraps to the width, indenting every line, keeping blank lines empty", () => {
    const text = wrap("one two three four five six seven", 14, "  ")
    expect(text).toBe("  one two\n  three four\n  five six\n  seven")
    expect(wrap("a\n\nb", 80, "  ")).toBe("  a\n\n  b")
  })

  it("draws section rules exactly as wide as the page", () => {
    expect(rule("writing", "5 posts")).toHaveLength(WIDTH)
    expect(rule("writing", "5 posts")).toMatch(/^── writing ─+ 5 posts$/)
  })

  it("aligns columns, leaving the last one ragged", () => {
    expect(
      columns([
        ["a", "bb", "c"],
        ["ccc", "d", "e"],
      ]),
    ).toEqual(["a    bb  c", "ccc  d   e"])
  })

  it("ends a cut-off excerpt on a whole word", () => {
    const long = `${"word ".repeat(50)}tail`
    const line = excerptLine(long)
    expect(line.endsWith("word…")).toBe(true)
    expect(line.length).toBeLessThanOrEqual(200)
    expect(excerptLine("Short.\n\nTwo  lines.")).toBe("Short. Two lines.")
  })

  it("re-flows Markdown prose but not headings, code or hard breaks", () => {
    const long = "word ".repeat(20).trim()
    const md = [
      "## A heading that is long " + long,
      long,
      `- ${long}`,
      `> ${long}`,
      "```",
      long,
      "```",
      "keep\\",
    ].join("\n")
    const out = wrapMarkdown(md, 40).split("\n")
    expect(out[0]).toBe("## A heading that is long " + long)
    expect(out.filter((l) => !l.startsWith("##") && l !== long).every((l) => l.length <= 40)).toBe(
      true,
    )
    expect(out).toContain(long) // inside the code fence
    expect(out.some((l) => l.startsWith("  word"))).toBe(true) // list item's hanging indent
    expect(out.filter((l) => l.startsWith("> ")).length).toBeGreaterThan(1)
    expect(out.at(-1)).toBe("keep\\")
  })

  it("lists the commands that fit in the page", () => {
    for (const line of commands().split("\n")) expect(line.length).toBeLessThanOrEqual(WIDTH)
  })
})

describe("the lab in text", () => {
  const status: LabStatus = {
    nodes: [
      node("Tower", 10, {
        services: [
          { name: "Jellyfin", up: true },
          { name: "Frigate", up: false },
        ],
        storage: [
          { label: "Bulk storage", usedGiB: 1800, totalGiB: 3600, health: "ONLINE", kind: "pool" },
        ],
      }),
      // Silent for ten minutes.
      node("Mini PC #2", 600, {
        services: [{ name: "Homarr", up: true }],
        storage: [
          { label: "VM disks", usedGiB: 10, totalGiB: 100, health: "ONLINE", kind: "pool" },
        ],
      }),
    ],
  }

  it("claims services and readings only for machines that are reporting", () => {
    const lines = labLines(status, now, ["Tower", "Mini PC #2"]).split("\n")
    expect(lines[0]).toMatch(/^1\/2 up · updated /)
    expect(lines[1]).toMatch(/Tower\s+up 12d\s+cpu 7%\s+mem 61%\s+1\/2 services up/)
    expect(lines[2]).toMatch(/Mini PC #2\s+no data\s+1 service$/)
  })

  it("prints /homecave with services, storage health, uptime and the log", () => {
    const text = homecaveText(
      status,
      {
        days: [],
        uptime: [{ kind: "node", name: "Tower", days: [], pct: 99.9 }],
        incidents: [
          { kind: "svc", name: "Frigate", state: "down", start: 1_794_000_000, end: null },
        ],
      },
      now,
      englishT("homecave"),
      ["Tower", "Mini PC #2"],
    )
    expect(text).toMatch(/Frigate\s+Tower\s+down/)
    expect(text).toMatch(/Homarr\s+Mini PC #2\s+no data/)
    expect(text).toMatch(/Bulk storage\s+Tower .*50%\s+online/)
    expect(text).toMatch(/VM disks\s+Mini PC #2 .*no data/)
    expect(text).toMatch(/Tower\s+99.9%/)
    expect(text).toMatch(/UTC\s+Frigate down\s+ongoing/)
    expect(text.endsWith("JSON: curl -sL itsashik.dev/api/lab-status\n")).toBe(true)
  })

  it("says so before the lab has reported", () => {
    expect(labLines(null, now)).toBe("The lab hasn't reported yet.")
  })
})

describe("wantsText (proxy)", () => {
  const request = (path: string, agent: string, accept = "*/*") =>
    new NextRequest(`https://www.itsashik.dev${path}`, {
      headers: { "user-agent": agent, accept },
    })

  it("sends command-line clients to the text view of pages that have one", () => {
    for (const agent of ["curl/8.9.1", "Wget/1.24.5", "HTTPie/3.2.4", "xh/0.22.0"]) {
      expect(wantsText(request("/", agent)), agent).toBe(true)
    }
    for (const path of [
      "/post",
      "/post/x",
      "/projects",
      "/projects/x",
      "/homecave",
      "/now",
      "/resume",
    ]) {
      expect(wantsText(request(path, "curl/8.9.1")), path).toBe(true)
    }
  })

  it("leaves browsers, HTML requests, other languages and other paths alone", () => {
    expect(wantsText(request("/", "Mozilla/5.0"))).toBe(false)
    expect(wantsText(request("/", "curl/8.9.1", "text/html"))).toBe(false)
    expect(wantsText(request("/de", "curl/8.9.1"))).toBe(false)
    expect(wantsText(request("/post/x/y", "curl/8.9.1"))).toBe(false)
    expect(wantsText(request("/studio", "curl/8.9.1"))).toBe(false)
  })
})
