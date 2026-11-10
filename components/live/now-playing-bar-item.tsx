"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type CSSProperties } from "react"
import { StatusDot } from "@/components/dashboard/status-dot"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { cn } from "@/lib/utils"
import { pickNowPlaying, type NowPlaying } from "./describe"
import { progressText, usePlaybackProgress } from "./playback-progress"
import { useLiveActivity } from "./use-live-activity"

/** Marquee speed, in pixels per second: slow enough to read in a glance. */
const SPEED = 30
/** Space between the end of the text and its repeat, in pixels (Tailwind `pr-8`). */
const GAP = 32

/**
 * One line of text that scrolls when it doesn't fit, and only then. Two copies sit side by side
 * so moving by half the track loops without a jump; the second is hidden from screen readers.
 * It pauses on hover or focus (the parent is the `group`), and with reduced motion it stays put
 * and ends in an ellipsis.
 */
function Marquee({ text }: { text: string }) {
  const box = useRef<HTMLSpanElement>(null)
  const measure = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  // The text's width while it overflows the box; 0 while it fits.
  const [overflow, setOverflow] = useState(0)
  const scrolling = overflow > 0 && !reduced

  // The observer reports the box as soon as it starts, so this also takes the first reading.
  // (The text is an inline span, which a ResizeObserver can't size; its width follows the box
  // or `text`.) Re-run when the measured span is swapped (fits <-> scrolling).
  useEffect(() => {
    const outer = box.current
    const inner = measure.current
    if (!outer || !inner || typeof ResizeObserver === "undefined") return
    const check = () => {
      const width = inner.offsetWidth
      setOverflow(width > outer.clientWidth + 1 ? width : 0)
    }
    const observer = new ResizeObserver(check)
    observer.observe(outer)
    return () => observer.disconnect()
  }, [text, scrolling])

  return (
    <span
      ref={box}
      className={cn(
        "block min-w-24 flex-1 overflow-hidden whitespace-nowrap text-foreground normal-case",
        scrolling
          ? "[mask-image:linear-gradient(to_right,transparent,black_10px,black_calc(100%-10px),transparent)]"
          : "text-ellipsis",
      )}
    >
      {scrolling ? (
        <span
          className="marquee-track inline-block"
          style={{ "--marquee-duration": `${(overflow + GAP) / SPEED}s` } as CSSProperties}
        >
          <span className="pr-8">
            <span ref={measure}>{text}</span>
          </span>
          <span aria-hidden className="pr-8">
            {text}
          </span>
        </span>
      ) : (
        <span ref={measure}>{text}</span>
      )}
    </span>
  )
}

/**
 * The statusline cell for what's playing right now, with a hairline progress bar along its
 * bottom edge. Links to the full live panel on /now.
 */
export function NowPlayingBarItemView({
  item,
  className,
  now,
}: {
  item: NowPlaying
  className?: string
  /** Pins the progress clock (tests). */
  now?: number
}) {
  const progress = usePlaybackProgress(item, now)
  return (
    <Link
      href="/now#live"
      aria-label={`${item.kind === "listening" ? "Listening to" : "Watching"} ${item.text}`}
      title={progress ? progressText(progress) : undefined}
      className={cn(className, "group relative max-w-96 min-w-0 shrink")}
    >
      <StatusDot status="up" pulse />
      <span className="shrink-0">{item.kind}</span>
      <Marquee text={item.text} />
      {progress && (
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-border">
          <span
            className="block h-full bg-foreground/60 transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
            style={{ width: `${progress.fraction * 100}%` }}
          />
        </span>
      )}
    </Link>
  )
}

/** Shown only while something is actually playing; "last played" never reaches the statusline. */
export function NowPlayingBarItem({ className }: { className?: string }) {
  const item = pickNowPlaying(useLiveActivity())
  return item ? <NowPlayingBarItemView item={item} className={className} /> : null
}
