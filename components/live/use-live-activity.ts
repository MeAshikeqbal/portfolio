"use client"

import { useEffect, useState } from "react"
import type { LiveActivity } from "@/lib/live/types"

/** How often a visible page re-asks; the API is CDN-cached for 30s anyway. */
export const LIVE_POLL_MS = 60_000

/**
 * Polls /api/now-playing while the tab is visible (and once more when it comes back).
 * `undefined` while the first response is pending; null if it failed.
 */
export function useLiveActivity(): LiveActivity | null | undefined {
  const [data, setData] = useState<LiveActivity | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | undefined

    const load = async () => {
      try {
        const response = await fetch("/api/now-playing")
        const json = response.ok ? ((await response.json()) as LiveActivity) : null
        if (!cancelled) setData(json)
      } catch {
        if (!cancelled) setData(null)
      }
    }
    const start = () => {
      clearInterval(timer)
      if (document.visibilityState !== "visible") return
      void load()
      timer = setInterval(load, LIVE_POLL_MS)
    }

    start()
    document.addEventListener("visibilitychange", start)
    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener("visibilitychange", start)
    }
  }, [])

  return data
}

export function hasActivity(data: LiveActivity | null | undefined): data is LiveActivity {
  return !!data && !!(data.spotify || data.trakt || data.jellyfin)
}
