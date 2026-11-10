import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { formatUptime, isNodeFresh, labSummary, nodeState } from "@/lib/lab/freshness"
import { MAX_BODY_BYTES, parseHeartbeat, sign, verify } from "@/lib/lab/heartbeat"
import { toPublicStatus } from "@/lib/lab/public"
import { readLabStatus, redisConfig, summarizeHistory, writeHeartbeat } from "@/lib/lab/store"
import type { LabNodeStatus, LabStatus } from "@/lib/lab/types"

const SECRET = "test-secret"
const now = new Date("2026-11-10T12:00:00Z")
const ts = String(Math.floor(now.getTime() / 1000))

/** A realistic v2 report from Tower's agent. */
const v2 = {
  v: 2,
  node: {
    name: "Tower",
    online: true,
    uptime: 540_000,
    interval: 30,
    cpu: { pct: 6, model: "Ryzen 5 3600", cores: 6, threads: 12 },
    load: [0.42, 0.31, 0.25],
    mem: { pct: 82, totalGiB: 15.5 },
    swap: { pct: 3, totalGiB: 8 },
    net: { inKBps: 840, outKBps: 120 },
    guests: { running: 7, total: 7, byCategory: { media: [3, 3], apps: [2, 2], network: [1, 1] } },
  },
  storage: [
    { label: "Bulk storage", usedGiB: 2581, totalGiB: 3597, health: "ONLINE", kind: "pool" },
    { label: "Off-site backups", usedGiB: 15, totalGiB: 65, health: null, kind: "backup" },
  ],
  peers: [
    { name: "Mini PC #1", online: true },
    { name: "Mini PC #2", online: false },
  ],
}

describe("verify", () => {
  const body = JSON.stringify(v2)
  it("accepts a correct signature inside the time window", () => {
    expect(verify(SECRET, ts, sign(SECRET, ts, body), body, now)).toBe(true)
  })
  it.each([
    ["a wrong secret", () => [SECRET, ts, sign("other", ts, body), body]],
    ["a tampered body", () => [SECRET, ts, sign(SECRET, ts, body), body.replace("Tower", "Towr")]],
    [
      "an old timestamp",
      () => [SECRET, String(+ts - 301), sign(SECRET, String(+ts - 301), body), body],
    ],
    ["a missing signature", () => [SECRET, ts, null, body]],
    ["no secret configured", () => ["", ts, sign("", ts, body), body]],
  ] as const)("refuses %s", (_, args) => {
    const [secret, t, sig, b] = args() as [string, string, string | null, string]
    expect(verify(secret, t, sig, b, now)).toBe(false)
  })
})

describe("parseHeartbeat", () => {
  it("accepts a v2 report, keeping only allowlisted fields", () => {
    const [node] = parseHeartbeat({
      ...v2,
      node: { ...v2.node, hostname: "pve", ip: "192.168.1.10", kernel: "7.0.14-19-pve" },
      extra: "dropped",
    })!
    expect(node).toMatchObject({ name: "Tower", interval: 30, cpu: { model: "Ryzen 5 3600" } })
    expect(node.storage).toHaveLength(2)
    expect(node.peers).toEqual(v2.peers)
    expect(JSON.stringify(node)).not.toMatch(/pve|192\.168|7\.0\.14/)
  })

  it("still accepts the v1 lab script (all nodes, 5-minute interval)", () => {
    expect(
      parseHeartbeat({ nodes: [{ name: "Tower", online: true, uptime: 10, cpu: { pct: 5 } }] }),
    ).toEqual([{ name: "Tower", online: true, uptime: 10, interval: 300 }])
  })

  it.each([
    ["a hostname-like name", { ...v2, node: { ...v2.node, name: "pve-1.lan" } }],
    [
      "a CPU model with a clock",
      { ...v2, node: { ...v2.node, cpu: { ...v2.node.cpu, model: "i3 @ 3.70GHz" } } },
    ],
    [
      "a CPU model with (R)",
      { ...v2, node: { ...v2.node, cpu: { ...v2.node.cpu, model: "Intel(R) Core" } } },
    ],
    [
      "an unknown category",
      {
        ...v2,
        node: { ...v2.node, guests: { running: 1, total: 1, byCategory: { producr: [1, 1] } } },
      },
    ],
    [
      "running above total",
      { ...v2, node: { ...v2.node, guests: { running: 3, total: 2, byCategory: {} } } },
    ],
    ["a percentage over 100", { ...v2, node: { ...v2.node, mem: { pct: 140, totalGiB: 16 } } }],
    ["an unknown pool health", { ...v2, storage: [{ ...v2.storage[0], health: "FINE" }] }],
    ["a pool name as label", { ...v2, storage: [{ ...v2.storage[0], label: "big-tank/data" }] }],
    ["more used than total", { ...v2, storage: [{ ...v2.storage[0], usedGiB: 5000 }] }],
    ["a v2 report without an interval", { ...v2, node: { ...v2.node, interval: undefined } }],
    [
      "a v1 report with duplicate names",
      {
        nodes: [
          { name: "A", online: true, uptime: 1 },
          { name: "A", online: true, uptime: 1 },
        ],
      },
    ],
    ["not an object", "nodes"],
  ])("rejects %s", (_, json) => {
    expect(parseHeartbeat(json)).toBeNull()
  })
})

const status = (overrides: Partial<LabNodeStatus>[] = []): LabStatus => ({
  nodes: overrides.map((o) => ({
    name: "Tower",
    online: true,
    uptime: 540_000,
    interval: 30,
    receivedAt: new Date(now.getTime() - 20_000).toISOString(),
    history: { t: [], cpu: [], mem: [], netIn: [], netOut: [] },
    availability24h: null,
    ...o,
  })),
})
const secondsAgo = (s: number) => new Date(now.getTime() - s * 1000).toISOString()

describe("node state", () => {
  it("is fresh for two intervals plus 30s (90s for the 30s agents, ~10 min for v1)", () => {
    expect(isNodeFresh(status([{ receivedAt: secondsAgo(89) }]).nodes[0], now)).toBe(true)
    expect(isNodeFresh(status([{ receivedAt: secondsAgo(91) }]).nodes[0], now)).toBe(false)
    expect(
      isNodeFresh(status([{ interval: 300, receivedAt: secondsAgo(600) }]).nodes[0], now),
    ).toBe(true)
  })

  it("is up only on its own fresh, online report", () => {
    expect(nodeState("Tower", status([{}]), now)).toMatchObject({ status: "up", label: "up · 6d" })
  })

  it("is down when silent and a fresh peer sees it offline", () => {
    const s = status([
      { name: "Tower", peers: [{ name: "Mini PC #2", online: false }] },
      { name: "Mini PC #2", receivedAt: secondsAgo(3600) },
    ])
    expect(nodeState("Mini PC #2", s, now)).toMatchObject({ status: "down", label: "down" })
    expect(labSummary(s, now)).toEqual({ status: "warn", label: "1/2 up" })
  })

  it("is 'no data' when silent and nobody says it's down (the agent, not the node)", () => {
    const s = status([
      { name: "Tower", peers: [{ name: "Mini PC #2", online: true }] },
      { name: "Mini PC #2", receivedAt: secondsAgo(3600) },
    ])
    expect(nodeState("Mini PC #2", s, now)).toMatchObject({ status: "idle", label: "no data" })
  })

  it("never claims anything about unknown names, and summarises", () => {
    expect(nodeState("Storage", status([{}]), now)).toBeNull()
    expect(labSummary(null, now)).toBeNull()
    expect(labSummary(status([{ receivedAt: secondsAgo(4000) }]), now)).toEqual({
      status: "idle",
      label: "no data",
    })
  })

  it("formats uptime", () => {
    expect(formatUptime(90)).toBe("1m")
    expect(formatUptime(7_200)).toBe("2h")
    expect(formatUptime(1_036_800)).toBe("12d")
  })
})

describe("summarizeHistory", () => {
  const t = (minutesAgo: number) => now.getTime() - minutesAgo * 60_000

  it("averages into 96 fifteen-minute buckets over the last 24h", () => {
    const { history } = summarizeHistory(
      [
        { t: t(1), c: 10, m: 50, i: 100, o: 10, u: 1 },
        { t: t(6), c: 20, m: 60, i: 300, o: 30, u: 1 },
        { t: t(60 * 25), c: 99, m: 99, i: 9, o: 9, u: 1 }, // older than 24h: ignored
      ],
      now,
    )
    expect(history.t).toHaveLength(96)
    expect(history.cpu.at(-1)).toBe(15)
    expect(history.netIn.at(-1)).toBe(200)
    expect(history.cpu.filter((v) => v !== null)).toHaveLength(1)
  })

  it("only claims availability with an hour of samples, counting downs", () => {
    const up = Array.from({ length: 11 }, (_, k) => ({ t: t(k * 5), u: 1 as const }))
    expect(summarizeHistory(up, now).availability24h).toBeNull()
    expect(summarizeHistory([...up, { t: t(60), u: 0 }], now).availability24h).toBe(91.7)
  })
})

/** Records Upstash REST calls; answers from a script of results. */
function fakeUpstash(results: unknown[]) {
  const calls: string[][] = []
  const impl = (async (_url: string | URL | Request, init?: RequestInit) => {
    calls.push(JSON.parse(String(init?.body)) as string[])
    return new Response(JSON.stringify({ result: results.shift() ?? null }), { status: 200 })
  }) as typeof fetch
  return { impl, calls }
}
const env = { UPSTASH_REDIS_REST_URL: "https://redis.example/", UPSTASH_REDIS_REST_TOKEN: "t" }

describe("store", () => {
  it("reads the Vercel integration's variable names too", () => {
    expect(redisConfig({ KV_REST_API_URL: "https://kv", KV_REST_API_TOKEN: "k" })).toEqual({
      url: "https://kv",
      token: "k",
    })
    expect(redisConfig({})).toBeNull()
  })

  it("writes a heartbeat in one EVAL, adding a down sample for an offline peer", async () => {
    const redis = fakeUpstash([1])
    const nodes = parseHeartbeat(v2)!
    expect(await writeHeartbeat(nodes, +ts, now, env, redis.impl)).toBe(1)
    expect(redis.calls).toHaveLength(1)
    const [cmd, , numkeys, ...rest] = redis.calls[0]
    expect(cmd).toBe("EVAL")
    // lab:nodes + 4 keys for Tower + 4 keys for the offline peer.
    expect(Number(numkeys)).toBe(9)
    expect(rest.slice(0, 9)).toContain("lab:node:Mini PC #2")
    const args = rest.slice(9)
    const peerEntry = args.indexOf("Mini PC #2")
    expect(args[peerEntry + 1]).toBe("") // no report: history only
    expect(JSON.parse(args[peerEntry + 2])).toMatchObject({ u: 0 })
  })

  it("reads every node in two commands and summarises its history", async () => {
    const latest = JSON.stringify({ ...parseHeartbeat(v2)![0], receivedAt: now.toISOString() })
    const sample = JSON.stringify({ t: now.getTime() - 60_000, c: 7, m: 80, i: 1, o: 1, u: 1 })
    const redis = fakeUpstash([
      ["Tower", "Ghost"],
      [latest, [sample], "", []],
    ])
    const result = await readLabStatus(env, redis.impl, { now })
    expect(redis.calls.map((c) => c[0])).toEqual(["SMEMBERS", "EVAL"])
    expect(result?.nodes.map((n) => n.name)).toEqual(["Tower"])
    expect(result?.nodes[0].history.cpu.at(-1)).toBe(7)
  })

  it("reads null when unconfigured, empty or failing", async () => {
    expect(await readLabStatus({}, fakeUpstash([]).impl)).toBeNull()
    expect(await readLabStatus(env, fakeUpstash([[]]).impl)).toBeNull()
    const failing = (async () => new Response("{}", { status: 500 })) as typeof fetch
    expect(await readLabStatus(env, failing)).toBeNull()
  })
})

describe("public status (the allowlist on the way out)", () => {
  it("never passes through anything outside the schema", () => {
    const leaky = status([
      {
        ...(parseHeartbeat(v2)![0] as LabNodeStatus),
        receivedAt: now.toISOString(),
        history: { t: [], cpu: [], mem: [], netIn: [], netOut: [] },
        availability24h: 99.9,
        ...({ hostname: "pve", vmids: [104, 156], tags: "producr", ip: "192.168.1.10" } as object),
      },
    ])
    const out = JSON.stringify(toPublicStatus(leaky))
    for (const secret of ['pve"', "104", "producr", "192.168", "hostname", "vmids"]) {
      expect(out).not.toContain(secret)
    }
    expect(out).toContain("Ryzen 5 3600")
  })
})

describe("POST /api/lab-heartbeat", () => {
  beforeEach(() => {
    vi.stubEnv("LAB_HEARTBEAT_SECRET", SECRET)
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t")
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  const post = async (body: string, sig?: string) => {
    const t = String(Math.floor(Date.now() / 1000))
    const { POST } = await import("@/app/api/lab-heartbeat/route")
    return POST(
      new Request("http://localhost/api/lab-heartbeat", {
        method: "POST",
        body,
        headers: { "x-lab-timestamp": t, "x-lab-signature": sig ?? sign(SECRET, t, body) },
      }),
    )
  }

  it("stores a valid heartbeat (204) and reports a replay as 409", async () => {
    vi.stubGlobal("fetch", fakeUpstash([1]).impl)
    expect((await post(JSON.stringify(v2))).status).toBe(204)
    vi.stubGlobal("fetch", fakeUpstash([0]).impl)
    expect((await post(JSON.stringify(v2))).status).toBe(409)
  })

  it("refuses bad signatures, malformed bodies and oversized requests", async () => {
    const redis = fakeUpstash([])
    vi.stubGlobal("fetch", redis.impl)
    expect((await post(JSON.stringify(v2), "0".repeat(64))).status).toBe(401)
    expect((await post("{not json")).status).toBe(400)
    expect(
      (await post(JSON.stringify({ ...v2, node: { ...v2.node, name: "pve.lan" } }))).status,
    ).toBe(400)
    expect((await post("x".repeat(MAX_BODY_BYTES + 1))).status).toBe(413)
    expect(redis.calls).toHaveLength(0)
  })

  it("is 501 until configured", async () => {
    vi.stubEnv("LAB_HEARTBEAT_SECRET", "")
    expect((await post(JSON.stringify(v2))).status).toBe(501)
  })
})

describe("real agent output (dry run on the cluster, 2026-11-10)", () => {
  it("parses every node's payload unchanged and nothing private is in it", async () => {
    const fixtures = (await import("./fixtures/lab-heartbeats.json")).default as Record<
      string,
      unknown
    >
    for (const [name, payload] of Object.entries(fixtures)) {
      const [node] = parseHeartbeat(payload)!
      expect(node.name).toBe(name)
      expect(node.cpu?.model).toMatch(/^(Ryzen|Core) /)
      const text = JSON.stringify(payload).toLowerCase()
      for (const word of [
        "pve",
        "192.168",
        "big-tank",
        "rpool",
        "pbs-sea",
        "producr",
        "plane",
        "frigate",
      ]) {
        expect(text).not.toContain(word)
      }
    }
  })
})
