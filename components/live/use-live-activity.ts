"use client"

import { useSyncExternalStore } from "react"
import type { LiveActivity } from "@/lib/live/types"

/** How often a visible page re-asks; the API is CDN-cached for 30s anyway. */
export const LIVE_POLL_MS = 60_000
/** After the current track or episode should have ended, look again this much later. */
export const LIVE_END_GRACE_MS = 5_000

type State = LiveActivity | null | undefined

/**
 * One poll per page, shared by every consumer (the statusline, the hero line, the /now panel and
 * Homecave): it starts with the first subscriber and stops with the last. `undefined` until the
 * first response; null if it failed.
 */
let state: State = undefined
const listeners = new Set<() => void>()
let pollTimer: ReturnType<typeof setInterval> | undefined
let endTimer: ReturnType<typeof setTimeout> | undefined
let inFlight = false

/** Stores the latest answer and tells every subscribed component to re-read it. */
function emit(next: State) {
  state = next
  for (const listener of listeners) listener()
}

/** The soonest end among things playing right now, when that's sooner than the next poll. */
function scheduleEndCheck(data: State) {
  clearTimeout(endTimer)
  const ends = [data?.spotify?.endsAt, data?.trakt?.endsAt]
    .map((iso) => (iso ? Date.parse(iso) : NaN))
    .filter(Number.isFinite)
  if (!ends.length) return
  const delay = Math.min(...ends) - Date.now() + LIVE_END_GRACE_MS
  if (delay > 0 && delay < LIVE_POLL_MS) endTimer = setTimeout(load, delay)
}

/**
 * Fetches /api/now-playing once (skipped while a request is already out) and publishes the
 * answer, or null on any failure. Drops the answer if every consumer unmounted meanwhile.
 */
async function load() {
  if (inFlight) return
  inFlight = true
  let next: State
  try {
    const response = await fetch("/api/now-playing")
    next = response.ok ? ((await response.json()) as LiveActivity) : null
  } catch {
    next = null
  } finally {
    inFlight = false
  }
  // Everyone may have left while the request was out.
  if (!listeners.size) return
  emit(next)
  scheduleEndCheck(next)
}

/** Cancels both the minute poll and any pending end-of-track check. */
function stop() {
  clearInterval(pollTimer)
  clearTimeout(endTimer)
}

/** (Re)starts polling while the tab is visible, and pauses it while hidden. */
function onVisibility() {
  stop()
  if (document.visibilityState !== "visible") return
  void load()
  pollTimer = setInterval(load, LIVE_POLL_MS)
}

/**
 * `useSyncExternalStore` subscription: the first subscriber starts polling and watching tab
 * visibility, the last one to leave stops both.
 */
function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) {
    onVisibility()
    document.addEventListener("visibilitychange", onVisibility)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size) return
    stop()
    document.removeEventListener("visibilitychange", onVisibility)
  }
}

/** For tests: forget the shared state and timers. */
export function resetLiveActivityStore() {
  stop()
  if (typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", onVisibility)
  }
  state = undefined
  inFlight = false
  listeners.clear()
}

/**
 * Live activity from /api/now-playing, polled while the tab is visible (and once more when it
 * comes back). `undefined` while the first response is pending; null if it failed.
 */
export function useLiveActivity(): State {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => undefined,
  )
}

export function hasActivity(data: LiveActivity | null | undefined): data is LiveActivity {
  return !!data && !!(data.spotify || data.trakt || data.jellyfin)
}
