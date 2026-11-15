"use client"

import { Pause, Play } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const FRAME = "block w-full rounded-lg border bg-surface-2"

/**
 * An uploaded clip. Normal videos get native controls and only load metadata until played.
 * "Loop" videos play muted on repeat like a GIF, but only start for visitors who don't prefer
 * reduced motion, and always have a pause button (WCAG 2.2.2).
 */
export function UploadedVideo({
  src,
  type,
  title,
  poster,
  loop,
}: {
  src: string
  type?: string
  title: string
  poster?: string
  loop?: boolean
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!loop || !ref.current) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    ref.current.play().catch(() => undefined)
  }, [loop])

  if (!loop) {
    return (
      <video
        className={FRAME}
        controls
        preload="metadata"
        playsInline
        poster={poster}
        aria-label={title}
      >
        <source src={src} type={type} />
      </video>
    )
  }

  return (
    <div className="relative">
      <video
        ref={ref}
        className={FRAME}
        muted
        loop
        playsInline
        preload="metadata"
        poster={poster}
        aria-label={title}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        <source src={src} type={type} />
      </video>
      <button
        type="button"
        onClick={() => {
          const video = ref.current
          if (!video) return
          if (video.paused) video.play().catch(() => undefined)
          else video.pause()
        }}
        className="absolute right-3 bottom-3 inline-flex size-9 items-center justify-center rounded-full border bg-background/85 text-foreground backdrop-blur transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={playing ? `Pause: ${title}` : `Play: ${title}`}
      >
        {playing ? (
          <Pause className="size-4" aria-hidden />
        ) : (
          <Play className="size-4" aria-hidden />
        )}
      </button>
    </div>
  )
}

/**
 * A YouTube video behind a click-to-load facade: only the thumbnail loads with the page; the
 * privacy-enhanced (youtube-nocookie) player loads when the visitor presses play.
 */
export function YouTubeEmbed({
  embedUrl,
  thumbnail,
  title,
}: {
  embedUrl: string
  thumbnail: string
  title: string
}) {
  const [active, setActive] = useState(false)

  return (
    <div className={cn(FRAME, "relative aspect-video overflow-hidden")}>
      {active ? (
        <iframe
          src={embedUrl}
          title={title}
          className="absolute inset-0 size-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button
          type="button"
          onClick={() => setActive(true)}
          className="group absolute inset-0 size-full cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          aria-label={`Play video: ${title}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- YouTube's CDN, not next/image */}
          <img
            src={thumbnail}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
          <span className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/10" />
          <span className="absolute top-1/2 left-1/2 inline-flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-transform group-hover:scale-105">
            <Play className="ml-0.5 size-6" aria-hidden />
          </span>
          <span className="absolute bottom-3 left-3 rounded-sm bg-background/90 px-2 py-1 label-caps text-foreground">
            YouTube
          </span>
        </button>
      )}
    </div>
  )
}
