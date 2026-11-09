import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { formatUptime, isFresh, labSummary, nodeStatus } from "@/lib/lab/freshness"
import { MAX_BODY_BYTES, parseHeartbeat, sign, verify } from "@/lib/lab/heartbeat"
import { readLabStatus, redisConfig, writeLabStatus } from "@/lib/lab/store"
import type { LabStatus } from "@/lib/lab/types"

const SECRET = "test-secret"
const now = new Date("2026-11-10T12:00:00Z")
const ts = String(Math.floor(now.getTime() / 1000))
const tower = { name: "Tower", online: true, uptime: 1_036_800 }

describe("verify", () => {
  const body = JSON.stringify({ nodes: [tower] })
  it("accepts a correct signature inside the time window", () => {
    expect(verify(SECRET, ts, sign(SECRET, ts, body), body, now)).toBe(true)
  })
  it.each([
    ["a wrong secret", () => [SECRET, ts, sign("other", ts, body), body]],
    ["a tampered body", () => [SECRET, ts, sign(SECRET, ts, body), body.replace("Tower", "Towr")]],
    [
      "an old timestamp",
      () => [SECRET, String(Number(ts) - 301), sign(SECRET, String(Number(ts) - 301), body), body],
    ],
    [
      "a future timestamp",
      () => [SECRET, String(Number(ts) + 301), sign(SECRET, String(Number(ts) + 301), body), body],
    ],
    ["a missing signature", () => [SECRET, ts, null, body]],
    ["a non-hex signature", () => [SECRET, ts, "z".repeat(64), body]],
    ["no secret configured", () => ["", ts, sign("", ts, body), body]],
  ] as const)("refuses %s", (_, args) => {
    const [secret, t, sig, b] = args() as [string, string, string | null, string]
    expect(verify(secret, t, sig, b, now)).toBe(false)
  })
})

describe("parseHeartbeat", () => {
  it("keeps only the allowlisted fields and zeroes uptime for offline nodes", () => {
    expect(
      parseHeartbeat({
        nodes: [
          { ...tower, ip: "192.168.1.10", hostname: "pve" },
          { name: "Mini PC #1", online: false, uptime: 500 },
        ],
      }),
    ).toEqual([tower, { name: "Mini PC #1", online: false, uptime: 0 }])
  })
  it.each([
    ["no nodes", { nodes: [] }],
    ["not an object", "nodes"],
    ["a hostname-like name", { nodes: [{ name: "pve-1.lan", online: true, uptime: 1 }] }],
    ["an address as name", { nodes: [{ name: "192.168.1.10", online: true, uptime: 1 }] }],
    ["a missing online flag", { nodes: [{ name: "Tower", uptime: 1 }] }],
    ["a negative uptime", { nodes: [{ name: "Tower", online: true, uptime: -1 }] }],
    ["duplicate names", { nodes: [tower, tower] }],
    [
      "too many nodes",
      { nodes: Array.from({ length: 9 }, (_, i) => ({ name: `N${i}`, online: true, uptime: 1 })) },
    ],
  ])("rejects %s", (_, json) => {
    expect(parseHeartbeat(json)).toBeNull()
  })
})

describe("freshness and labels", () => {
  const status = (minutesAgo: number, nodes = [tower]): LabStatus => ({
    nodes,
    receivedAt: new Date(now.getTime() - minutesAgo * 60_000).toISOString(),
  })
  it("is fresh for 10 minutes, then nothing is claimed", () => {
    expect(isFresh(status(9), now)).toBe(true)
    expect(isFresh(status(11), now)).toBe(false)
    expect(isFresh(status(-60), now)).toBe(false)
    expect(isFresh(null, now)).toBe(false)
  })
  it("labels nodes: green only when fresh and online", () => {
    expect(nodeStatus(tower, true)).toEqual({ status: "up", label: "up · 12d" })
    expect(nodeStatus({ ...tower, online: false, uptime: 0 }, true)).toEqual({
      status: "down",
      label: "down",
    })
    expect(nodeStatus(tower, false)).toEqual({ status: "idle", label: "no data" })
    expect(nodeStatus(undefined, true)).toBeNull()
  })
  it("summarises the cluster", () => {
    const off = { name: "Mini PC #2", online: false, uptime: 0 }
    expect(labSummary(status(1), true)).toEqual({ status: "up", label: "1/1 up" })
    expect(labSummary(status(1, [tower, off]), true)).toEqual({ status: "warn", label: "1/2 up" })
    expect(labSummary(status(1, [off]), true)).toEqual({ status: "down", label: "0/1 up" })
    expect(labSummary(status(30), false)).toEqual({ status: "idle", label: "no data" })
    expect(labSummary(null, true)).toBeNull()
  })
  it("formats uptime", () => {
    expect(formatUptime(90)).toBe("1m")
    expect(formatUptime(7_200)).toBe("2h")
    expect(formatUptime(1_036_800)).toBe("12d")
  })
})

/** In-memory Upstash REST stand-in. */
function fakeUpstash() {
  const data = new Map<string, string>()
  const calls: unknown[] = []
  const impl = (async (_url: string | URL | Request, init?: RequestInit) => {
    const args = JSON.parse(String(init?.body)) as string[]
    calls.push(args)
    const [cmd, key, value] = args
    if (cmd === "SET") data.set(key, value)
    const result = cmd === "GET" ? (data.get(key) ?? null) : "OK"
    return new Response(JSON.stringify({ result }), { status: 200 })
  }) as typeof fetch
  return { impl, data, calls }
}

describe("store", () => {
  const env = { UPSTASH_REDIS_REST_URL: "https://redis.example/", UPSTASH_REDIS_REST_TOKEN: "t" }
  it("reads the Vercel integration's variable names too", () => {
    expect(redisConfig({ KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "k" })).toEqual({
      url: "https://kv.example",
      token: "k",
    })
    expect(redisConfig({})).toBeNull()
  })
  it("round-trips a heartbeat with a one-day expiry", async () => {
    const redis = fakeUpstash()
    const status = { nodes: [tower], receivedAt: now.toISOString(), signedAt: Number(ts) }
    await writeLabStatus(status, env, redis.impl)
    expect(redis.calls[0]).toEqual(expect.arrayContaining(["SET", "lab:heartbeat", "EX", 86400]))
    expect(await readLabStatus(env, redis.impl)).toMatchObject({ nodes: [tower] })
  })
  it("reads null when unconfigured, empty, failing or malformed", async () => {
    expect(await readLabStatus({}, fakeUpstash().impl)).toBeNull()
    expect(await readLabStatus(env, fakeUpstash().impl)).toBeNull()
    const failing = (async () => new Response("{}", { status: 500 })) as typeof fetch
    expect(await readLabStatus(env, failing)).toBeNull()
    const junk = fakeUpstash()
    junk.data.set("lab:heartbeat", "not json")
    expect(await readLabStatus(env, junk.impl)).toBeNull()
  })
})

describe("POST /api/lab-heartbeat", () => {
  const redis = fakeUpstash()
  beforeEach(() => {
    vi.stubEnv("LAB_HEARTBEAT_SECRET", SECRET)
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t")
    vi.stubGlobal("fetch", redis.impl)
    redis.data.clear()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  const post = async (body: string, t = String(Math.floor(Date.now() / 1000)), sig?: string) => {
    const { POST } = await import("@/app/api/lab-heartbeat/route")
    return POST(
      new Request("http://localhost/api/lab-heartbeat", {
        method: "POST",
        body,
        headers: { "x-lab-timestamp": t, "x-lab-signature": sig ?? sign(SECRET, t, body) },
      }),
    )
  }

  it("stores a valid heartbeat, then refuses a replay of it", async () => {
    const body = JSON.stringify({ nodes: [tower] })
    const t = String(Math.floor(Date.now() / 1000))
    expect((await post(body, t)).status).toBe(204)
    expect(JSON.parse(redis.data.get("lab:heartbeat")!)).toMatchObject({ nodes: [tower] })
    expect((await post(body, t)).status).toBe(409)
  })
  it("refuses bad signatures, malformed bodies and oversized requests", async () => {
    expect((await post(JSON.stringify({ nodes: [tower] }), undefined, "0".repeat(64))).status).toBe(
      401,
    )
    expect((await post("{not json")).status).toBe(400)
    expect(
      (await post(JSON.stringify({ nodes: [{ name: "pve.lan", online: true, uptime: 1 }] })))
        .status,
    ).toBe(400)
    expect((await post("x".repeat(MAX_BODY_BYTES + 1))).status).toBe(413)
    expect(redis.data.size).toBe(0)
  })
  it("is 501 until configured", async () => {
    vi.stubEnv("LAB_HEARTBEAT_SECRET", "")
    expect((await post(JSON.stringify({ nodes: [tower] }))).status).toBe(501)
  })
})

describe("GET /api/lab-status", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })
  it("serves only the public fields, cached briefly", async () => {
    const redis = fakeUpstash()
    redis.data.set(
      "lab:heartbeat",
      JSON.stringify({
        nodes: [{ ...tower, secret: "x" }],
        receivedAt: now.toISOString(),
        signedAt: 1,
      }),
    )
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t")
    vi.stubGlobal("fetch", redis.impl)
    const { GET } = await import("@/app/api/lab-status/route")
    const response = await GET()
    expect(response.headers.get("cache-control")).toContain("s-maxage=60")
    expect(await response.json()).toEqual({ nodes: [tower], receivedAt: now.toISOString() })
  })
  it("is null when nothing is configured", async () => {
    const { GET } = await import("@/app/api/lab-status/route")
    expect(await (await GET()).json()).toBeNull()
  })
})
