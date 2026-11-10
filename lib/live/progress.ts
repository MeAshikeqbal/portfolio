/**
 * Playback progress from absolute start/end times. Shared by the fetchers (which build the
 * times) and the client (which turns them into a bar), so it must stay free of server-only code.
 */

export interface Timing {
  startedAt: string | null
  endsAt: string | null
}

export const NO_TIMING: Timing = { startedAt: null, endsAt: null }

export interface Progress {
  /** 0–1, clamped. */
  fraction: number
  elapsedMs: number
  totalMs: number
}

const parse = (iso: string | null) => (iso ? Date.parse(iso) : NaN)

/**
 * Timing only when it describes a real, finite span: a start before an end. Anything else (a
 * missing or garbled time, a zero or negative length) is no timing at all, so no bar is drawn.
 */
export function timing(startMs: number | null, endMs: number | null): Timing {
  if (startMs === null || endMs === null) return NO_TIMING
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return NO_TIMING
  return { startedAt: new Date(startMs).toISOString(), endsAt: new Date(endMs).toISOString() }
}

/** Where playback is at `nowMs`, clamped to the span; null without a usable start and end. */
export function progressAt(t: Timing, nowMs: number): Progress | null {
  const start = parse(t.startedAt)
  const end = parse(t.endsAt)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  const totalMs = end - start
  const elapsedMs = Math.min(Math.max(nowMs - start, 0), totalMs)
  return { fraction: elapsedMs / totalMs, elapsedMs, totalMs }
}

/** "3:07", or "1:02:09" past an hour. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, "0")
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`
}
