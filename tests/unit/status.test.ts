import { describe, expect, it } from "vitest"
import { SYNC_FRESH_HOURS, syncStatus } from "@/lib/status"

describe("syncStatus", () => {
  const now = new Date("2026-11-09T12:00:00Z")
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString()

  it("claims nothing when the sync has never run", () => {
    expect(syncStatus(null, now)).toBeNull()
    expect(syncStatus(undefined, now)).toBeNull()
  })

  it("is up while the last sync is recent", () => {
    expect(syncStatus(hoursAgo(2), now)).toEqual({ status: "up", label: "github sync ok" })
    expect(syncStatus(hoursAgo(SYNC_FRESH_HOURS), now)?.status).toBe("up")
  })

  it("warns once the daily sync has gone quiet", () => {
    expect(syncStatus(hoursAgo(SYNC_FRESH_HOURS + 1), now)).toEqual({
      status: "warn",
      label: "github sync stale",
    })
  })
})
