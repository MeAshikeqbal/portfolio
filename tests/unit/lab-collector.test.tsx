import { render, screen, within } from "@testing-library/react"
import { execFileSync } from "node:child_process"
import { describe, expect, it } from "vitest"
import { LabDashboardView } from "@/components/homecave/lab-dashboard"
import { LabTodayView } from "@/components/homecave/lab-today"
import { LabServiceBadgeView } from "@/components/lab/lab-badges"
import { parseHeartbeat } from "@/lib/lab/heartbeat"
import { toPublicStatus } from "@/lib/lab/public"
import { labToday, serviceState } from "@/lib/lab/services"
import { summarizeHistory, writeHeartbeat } from "@/lib/lab/store"
import type { LabNode, LabNodeStatus, LabStatus } from "@/lib/lab/types"
import fixtures from "./fixtures/lab-heartbeats-collector.json"

const now = new Date("2026-11-10T12:00:00Z")
const ago = (s: number) => new Date(now.getTime() - s * 1000).toISOString()
const history = { t: [], cpu: [], mem: [], netIn: [], netOut: [], temp: [], gpu: [], edge: [] }

/** A fixture payload as the site would serve it: parsed, received `age` seconds ago. */
function served(payload: unknown, age = 10): LabNodeStatus {
  const [node] = parseHeartbeat(payload)!
  return { ...node, receivedAt: ago(age), history, availability24h: 100 }
}

const tower = () => structuredClone(fixtures.tower) as { v: 2; node: Record<string, unknown> }
const withNode = (patch: Record<string, unknown>) => {
  const body = tower()
  body.node = { ...body.node, ...patch }
  return body
}

describe("collector sections in a heartbeat", () => {
  it("parses the real collector-merged payloads (2026-11-10), nothing private in them", () => {
    for (const payload of Object.values(fixtures)) {
      const [node] = parseHeartbeat(payload)!
      expect(node.services?.length).toBeGreaterThan(0)
      expect(node.containers!.ok).toBeLessThanOrEqual(node.containers!.total)
      expect(node.temps?.cpuC).toBeGreaterThan(20)
      expect(node.scrubs?.[0].label).toMatch(/storage|disks/)
      const text = JSON.stringify(payload).toLowerCase()
      for (const word of [
        "pve",
        "192.168",
        "big-tank",
        "rpool",
        "pbs-sea",
        "producr",
        "plane",
        "crowdsec",
        "qbittorrent",
        "gluetun",
        "dockhand",
        "tracearr",
        "/opt/",
        "querylog",
      ]) {
        expect(text).not.toContain(word)
      }
    }
    const [t] = parseHeartbeat(fixtures.tower)!
    expect(t.gpu?.memTotalMiB).toBe(4096)
    expect(t.backup?.status).toBe("ok")
    expect(t.services?.map((s) => s.name)).toContain("Proxmox Backup Server")
    const [m] = parseHeartbeat(fixtures.mini2)!
    expect(m.services?.map((s) => s.name)).toContain("Sonarr, Radarr, Lidarr")
  })

  it.each<[string, Record<string, unknown>]>([
    ["a service name with a dot", { services: [{ name: "jellyfin.local", up: true }] }],
    ["a service name with a slash", { services: [{ name: "http://x", up: true }] }],
    [
      "duplicate services",
      {
        services: [
          { name: "Jellyfin", up: true },
          { name: "Jellyfin", up: false },
        ],
      },
    ],
    [
      "too many services",
      { services: Array.from({ length: 25 }, (_, i) => ({ name: `S${i}`, up: true })) },
    ],
    ["more healthy containers than containers", { containers: { ok: 5, total: 4 } }],
    ["an impossible CPU temperature", { temps: { cpuC: 400, diskC: null } }],
    [
      "more VRAM used than exists",
      { gpu: { utilPct: 1, memUsedMiB: 5000, memTotalMiB: 4096, tempC: 50, encoders: 0 } },
    ],
    [
      "an unknown backup status",
      { backup: { at: 1794290923, status: "maybe", covered: 1, total: 2 } },
    ],
    [
      "a scrub on a pool name with a slash",
      { scrubs: [{ label: "big/tank", at: 1794090115, errors: 0 }] },
    ],
    ["a scrub dated before 2020", { scrubs: [{ label: "VM disks", at: 1000, errors: 0 }] }],
    ["an unknown resource category", { resources: { secret: { cpuPct: 1, memGiB: 1 } } }],
    ["a blocked share over 100%", { dns: { queries: 10, blockedPct: 101, hours: 3 } }],
  ])("rejects the whole report for %s", (_label, patch) => {
    expect(parseHeartbeat(withNode(patch))).toBeNull()
  })

  it("drops unknown keys inside every section, on the way in and out", () => {
    const [node] = parseHeartbeat(
      withNode({
        services: [{ name: "Jellyfin", up: true, container: "jellyfin-1", ip: "10.0.0.4" }],
        edge: { rpm: 12, errPct: 0, topPath: "/admin", clients: ["1.2.3.4"] },
        dns: { queries: 100, blockedPct: 9.5, hours: 4, topDomain: "example.com" },
      }),
    )!
    const served: LabStatus = {
      nodes: [{ ...node, receivedAt: ago(1), history, availability24h: null }],
    }
    const text = JSON.stringify(toPublicStatus(served))
    for (const leak of ["jellyfin-1", "10.0.0.4", "/admin", "1.2.3.4", "example.com"]) {
      expect(text).not.toContain(leak)
    }
    expect(toPublicStatus(served).nodes[0].edge).toEqual({ rpm: 12, errPct: 0 })
  })
})

describe("service state", () => {
  const status = (age: number, up = true): LabStatus => ({
    nodes: [served(withNode({ services: [{ name: "Jellyfin", up }] }), age)],
  })

  it("is up or down from a fresh report, case-insensitively", () => {
    expect(serviceState("Jellyfin", status(10), now)).toEqual({ status: "up", label: "up" })
    expect(serviceState("jellyfin", status(10, false), now)).toEqual({
      status: "down",
      label: "down",
    })
  })

  it("is 'no data' when the node that runs it went quiet, and absent if never reported", () => {
    expect(serviceState("Jellyfin", status(600), now)?.label).toBe("no data")
    expect(serviceState("Plex", status(10), now)).toBeNull()
    expect(serviceState("Jellyfin", null, now)).toBeNull()
  })

  it("renders as a word, in its status colour", () => {
    render(<LabServiceBadgeView state={{ status: "down", label: "down" }} />)
    expect(screen.getByText("down")).toHaveClass("text-status-down-fg")
  })
})

describe("today in the lab", () => {
  const cluster = (): LabStatus => ({
    nodes: [served(fixtures.tower), served(fixtures.mini1), served(fixtures.mini2)],
  })

  it("aggregates the fresh nodes' readings", () => {
    const today = labToday(cluster(), now)
    expect(today.edge?.rpm).toBeGreaterThanOrEqual(0)
    expect(today.wan?.lossPct).toBe(0)
    expect(today.media?.savedGB).toBe(304)
    expect(today.backup).toMatchObject({ status: "ok", covered: 17, total: 19 })
    expect(today.scrubs).toMatchObject({ errors: 0, pools: 4 })
    expect(today.containers!.total).toBe(9 + 21 + 16)
  })

  it("ignores stale nodes, and renders nothing without collector data", () => {
    const stale = { nodes: [served(fixtures.tower, 600)] }
    expect(labToday(stale, now).backup).toBeNull()
    const { container } = render(<LabTodayView status={stale} now={now} streams={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("shows each reading with its state spelled out", () => {
    const status = cluster()
    status.nodes[0].backup = { ...status.nodes[0].backup!, status: "warnings" }
    render(<LabTodayView status={status} now={now} streams={2} />)
    const today = screen.getByRole("region", { name: "today in the lab" })
    expect(within(today).getByText("with warnings")).toHaveClass("text-status-warn-fg")
    expect(within(today).getByText("no errors")).toHaveClass("text-status-up-fg")
    // Containers are back in the strip; the media savings tile is gone.
    expect(within(today).getByText("containers").closest("div")).toHaveTextContent("46/46")
    expect(within(today).queryByText("space saved")).toBeNull()
    expect(within(today).getByText("on Jellyfin, now")).toBeVisible()
    expect(within(today).getByText("2")).toBeVisible()
    // DNS hasn't reported yet in these fixtures (AdGuard flushes its log in batches).
    expect(within(today).getAllByText("not reported").length).toBeGreaterThanOrEqual(1)
  })
})

describe("node panels with collector readings", () => {
  it("adds temperature and GPU tiles, and container health with the guests", () => {
    render(
      <LabDashboardView
        status={{ nodes: [served(fixtures.tower)] }}
        now={now}
        specs={[{ name: "Tower", description: "GTX 1050 Ti" }]}
        streams={null}
      />,
    )
    const panel = screen.getByRole("region", { name: "Tower" })
    expect(within(panel).getByText("temperature")).toBeVisible()
    expect(within(panel).getByText(/^cpu · hottest disk \d+°C$/)).toBeVisible()
    expect(within(panel).getByText(/^vram 0\.4\/4 GiB/)).toBeVisible()
    expect(within(panel).getByText("containers healthy")).toBeVisible()
    // Memory per category rides on the guest chips.
    expect(
      within(panel).getAllByText(/^· [\d.]+ GiB$/, { selector: "span" }).length,
    ).toBeGreaterThan(0)
  })

  it("keeps an odd last tile in its half and fills the row with a pseudo-element", () => {
    const node = served(fixtures.mini1)
    render(<LabDashboardView status={{ nodes: [node] }} now={now} specs={[]} />)
    const panel = screen.getByRole("region", { name: "Mini PC #1" })
    const grid = panel.querySelector("dl")!
    const tiles = grid.querySelectorAll(":scope > div")
    // Only real dt/dd groups in the dl: the blank cell is CSS, not markup.
    expect(tiles).toHaveLength(5)
    expect(tiles[4]).not.toHaveClass("col-span-2")
    expect(grid).toHaveClass("after:bg-surface")
  })
})

describe("history with collector series", () => {
  it("averages CPU temperature, GPU and edge traffic into the 24h buckets", () => {
    const t = now.getTime() - 60_000
    const { history: h } = summarizeHistory([{ t, u: 1, tc: 60, g: 10, e: 20 }], now)
    expect(h.temp.at(-1)).toBe(60)
    expect(h.gpu.at(-1)).toBe(10)
    expect(h.edge.at(-1)).toBe(20)
  })

  it("stores those series in the same one-EVAL write", async () => {
    const calls: string[][] = []
    const fetchImpl = (async (_u: unknown, init?: RequestInit) => {
      calls.push(JSON.parse(String(init?.body)) as string[])
      return new Response(JSON.stringify({ result: 1 }))
    }) as typeof fetch
    const nodes = parseHeartbeat(fixtures.tower) as LabNode[]
    const env = { UPSTASH_REDIS_REST_URL: "https://r", UPSTASH_REDIS_REST_TOKEN: "t" }
    await writeHeartbeat(nodes, 1794291000, now, env, fetchImpl)
    expect(calls).toHaveLength(1)
    const sample = JSON.parse(calls[0].at(-1)!)
    expect(sample).toMatchObject({ tc: nodes[0].temps!.cpuC, g: nodes[0].gpu!.utilPct })
    expect(sample.e).toBe(nodes[0].edge!.rpm)
  })
})

describe("the lab collector (python, against fixture command output)", () => {
  it("passes its own unit tests", () => {
    // Throws (failing this test, with unittest's report) if any Python test fails.
    const out = execFileSync("python3", ["-I", "scripts/lab-heartbeat/test_collect.py"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
    expect(out).toBe("")
  })
})

describe("edge security (CrowdSec, unnamed)", () => {
  const hourly = (n: number) => [...Array(23).fill(0), n]
  const security = { bans: 2, attacks24h: 5, hourly: hourly(5), byKind: { probing: 4, exploit: 1 } }

  it("accepts consistent counts and rejects anything else", () => {
    const [node] = parseHeartbeat(withNode({ security }))!
    expect(node.security).toEqual(security)
    for (const bad of [
      { ...security, hourly: hourly(4) }, // hours don't add up
      { ...security, byKind: { probing: 5, exploit: 1 } }, // kinds don't add up
      { ...security, byKind: { probing: 4, "crowdsecurity/http-cve": 1 } }, // scenario names
      { ...security, hourly: [5] }, // not 24 hours
      { ...security, bans: -1 },
    ]) {
      expect(parseHeartbeat(withNode({ security: bad }))).toBeNull()
    }
  })

  it("passes only counts through, and shows them without naming the tool", () => {
    const [node] = parseHeartbeat(
      withNode({ security: { ...security, ips: ["203.0.113.9"], scenarios: ["http-cve"] } }),
    )!
    const status: LabStatus = {
      nodes: [{ ...node, receivedAt: ago(1), history, availability24h: null }],
    }
    const text = JSON.stringify(toPublicStatus(status))
    expect(text).not.toContain("203.0.113.9")
    expect(text).not.toContain("http-cve")

    render(<LabTodayView status={status} now={now} streams={null} />)
    const today = screen.getByRole("region", { name: "today in the lab" })
    // Without request counts (an older collector), the tile falls back to attacks.
    expect(within(today).getByText("attacks detected").closest("div")).toHaveTextContent("5")
    expect(within(today).getByText("2 banned here · 24h")).toBeVisible()
    expect(within(today).getByText("probing 4 · exploits 1")).toBeVisible()
    expect(within(today).getByRole("img", { name: /Attacks detected per hour/ })).toBeVisible()
    expect(today).not.toHaveTextContent(/crowdsec/i)
  })

  it("says nothing about kinds on a quiet day", () => {
    const quiet = { bans: 0, attacks24h: 0, hourly: hourly(0), byKind: {} }
    const [node] = parseHeartbeat(withNode({ security: quiet }))!
    render(
      <LabTodayView
        status={{ nodes: [{ ...node, receivedAt: ago(1), history, availability24h: null }] }}
        now={now}
        streams={null}
      />,
    )
    expect(screen.getByText("24h")).toBeVisible()
    expect(screen.queryByText("detected here · 24h")).toBeNull()
  })

  it("leads with requests checked (it moves), the blocklist under it", () => {
    const checkedHourly = [...Array(22).fill(100), 2552, 697]
    const full = {
      bans: 0,
      attacks24h: 0,
      hourly: hourly(0),
      byKind: {},
      blocklist: {
        total: 3719,
        byKind: { bruteforce: 2228, exploit: 889, probing: 496, crawler: 106 },
      },
      checked24h: 2200 + 2552 + 697,
      checkedHourly,
    }
    const [node] = parseHeartbeat(withNode({ security: full }))!
    expect(node.security).toEqual(full)
    for (const bad of [
      { ...full, checked24h: 1 }, // hours don't add up
      { ...full, blocklist: { ...full.blocklist, total: 1 } }, // kinds don't add up
      { ...full, checkedHourly: [1] },
    ]) {
      expect(parseHeartbeat(withNode({ security: bad }))).toBeNull()
    }
    render(
      <LabTodayView
        status={{ nodes: [{ ...node, receivedAt: ago(1), history, availability24h: null }] }}
        now={now}
        streams={null}
      />,
    )
    const tile = screen.getByText("security checks").closest("div")!
    expect(tile).toHaveTextContent("5.4K")
    expect(within(tile).getByText("3.7K blocklisted · 24h")).toBeVisible()
    expect(
      within(tile).getByRole("img", { name: /Requests checked for known attackers/ }),
    ).toBeVisible()
    expect(
      screen.getByText("brute force 2,228 · exploits 889 · probing 496 · crawlers 106"),
    ).toBeVisible()
  })
})
