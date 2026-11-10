"use client"

import { useEffect, useState } from "react"
import { formatDuration, progressAt, type Progress, type Timing } from "@/lib/live/progress"
import { cn } from "@/lib/utils"

/**
 * Playback progress, re-measured every second against the visitor's clock. `fixedNow` pins the
 * clock (tests, previews). Rendered only after the live data arrives in the browser, so there's
 * no server render to disagree with.
 */
export function usePlaybackProgress(timing: Timing, fixedNow?: number): Progress | null {
  const [tick, setTick] = useState(() => Date.now())
  const active = fixedNow === undefined && Boolean(timing.startedAt && timing.endsAt)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])
  return progressAt(timing, fixedNow ?? tick)
}

/** "2:31 / 3:40" */
export const progressText = (p: Progress) =>
  `${formatDuration(p.elapsedMs)} / ${formatDuration(p.totalMs)}`

/** "2:31 of 3:40", for screen readers. */
const progressValueText = (p: Progress) =>
  `${formatDuration(p.elapsedMs)} of ${formatDuration(p.totalMs)}`

/**
 * A thin track with elapsed / total beside it, for a playing row on /now. Neutral ink only:
 * it's a measurement, not a status. Nothing renders without a usable start and end.
 */
export function PlaybackProgress({
  timing,
  label,
  now,
  className,
}: {
  timing: Timing
  /** Accessible name, e.g. "Track progress". */
  label: string
  now?: number
  className?: string
}) {
  const progress = usePlaybackProgress(timing, now)
  if (!progress) return null
  const percent = progress.fraction * 100
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-valuetext={progressValueText(progress)}
        className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2 ring-1 ring-border ring-inset"
      >
        <div
          className="h-full rounded-full bg-foreground/60 transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
        {progressText(progress)}
      </span>
    </div>
  )
}
