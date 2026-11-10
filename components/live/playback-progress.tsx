"use client"

import { useEffect, useState } from "react"
import { Meter } from "@/components/dashboard/meter"
import { formatDuration, progressAt, type Progress, type Timing } from "@/lib/live/progress"

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
export const progressValueText = (p: Progress) =>
  `${formatDuration(p.elapsedMs)} of ${formatDuration(p.totalMs)}`

/**
 * Playback as the site's thin neutral meter (the same one storage rows use), announced as a
 * progress bar. The elapsed / total time is printed beside it in the row, never only drawn,
 * and on phones it's the only form shown.
 */
export function PlaybackMeter({ progress, label }: { progress: Progress; label: string }) {
  return (
    // Phones put the row's facts under the title, which leaves the bar stranded on the right:
    // there the printed time alone carries it.
    <Meter
      className="hidden sm:block"
      role="progressbar"
      value={progress.elapsedMs}
      max={progress.totalMs}
      label={label}
      valueText={progressValueText(progress)}
    />
  )
}
