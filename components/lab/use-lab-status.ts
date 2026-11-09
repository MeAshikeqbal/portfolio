"use client"

import { useEffect, useState } from "react"
import type { LabStatus } from "@/lib/lab/types"

const POLL_MS = 60_000

/**
 * One shared poll of /api/lab-status per page, however many components show the lab. Polls
 * only while the tab is visible. `undefined` until the first answer; null when the lab has
 * never reported (or the request failed), which renders as no status at all.
 */
type Listener = (status: LabStatus | null) => void
const listeners = new Set<Listener>()
let latest: LabStatus | null | undefined
let timer: ReturnType<typeof setInterval> | undefined

async function load() {
  try {
    const response = await fetch("/api/lab-status")
    latest = response.ok ? ((await response.json()) as LabStatus | null) : null
  } catch {
    latest = null
  }
  for (const listener of listeners) listener(latest ?? null)
}

function start() {
  clearInterval(timer)
  timer = undefined
  if (document.visibilityState !== "visible" || listeners.size === 0) return
  void load()
  timer = setInterval(load, POLL_MS)
}

export function useLabStatus(): { status: LabStatus | null | undefined; now: Date } {
  const [status, setStatus] = useState<LabStatus | null | undefined>(latest)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const listener: Listener = (value) => {
      setStatus(value)
      setNow(new Date())
    }
    listeners.add(listener)
    if (listeners.size === 1) {
      start()
      document.addEventListener("visibilitychange", start)
    } else if (latest !== undefined) {
      listener(latest)
    }
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) {
        clearInterval(timer)
        timer = undefined
        document.removeEventListener("visibilitychange", start)
      }
    }
  }, [])

  return { status, now }
}

/** For tests: forget the shared state. */
export function resetLabStatus() {
  latest = undefined
  clearInterval(timer)
  timer = undefined
  listeners.clear()
}
