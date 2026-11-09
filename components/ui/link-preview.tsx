"use client"

import Image from "next/image"
import { HoverCard } from "radix-ui"
import { useState, type ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/** Viewport the target page is rendered at before cropping and scaling. */
const VIEWPORT_WIDTH = 1280

/**
 * thum.io screenshot of a page's first screen, cropped to the preview's aspect ratio and
 * rendered at 2× for sharp hover cards. Keyless free tier; next/image caches each result, so
 * repeat hovers don't reach thum.io again.
 */
export function screenshotUrl(url: string, width: number, height: number): string {
  const crop = Math.round((VIEWPORT_WIDTH * height) / width)
  return `https://image.thum.io/get/noanimate/viewportWidth/${VIEWPORT_WIDTH}/width/${width * 2}/crop/${crop}/${url}`
}

interface LinkPreviewProps {
  url: string
  children: ReactNode
  className?: string
  width?: number
  height?: number
}

/**
 * External link that shows a screenshot of the target on hover.
 * The screenshot is only requested once the card opens (after a short hover intent delay),
 * never on page load, which keeps the screenshot service's free tier from rate-limiting. Touch devices
 * don't open hover cards, so they just get the link.
 */
export function LinkPreview({
  url,
  children,
  className,
  width = 240,
  height = 150,
}: LinkPreviewProps) {
  // A first capture takes a second or two: show a skeleton until the image arrives.
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading")
  let host = url
  try {
    host = new URL(url).hostname
  } catch {
    // Keep the raw URL as the label.
  }

  return (
    <HoverCard.Root
      openDelay={300}
      closeDelay={100}
      onOpenChange={(open) => open && setState((s) => (s === "loaded" ? s : "loading"))}
    >
      <HoverCard.Trigger asChild>
        <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
          {children}
        </a>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="top"
          sideOffset={8}
          className={cn(
            "z-50 rounded-lg border bg-surface p-1 shadow-md",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          )}
        >
          <div className="relative" style={{ width, height }}>
            {state !== "loaded" && (
              <div className="absolute inset-0 grid place-items-center">
                <Skeleton className="absolute inset-0" />
                <span role="status" className="relative label-caps">
                  {state === "failed" ? "preview unavailable" : "capturing screenshot…"}
                </span>
              </div>
            )}
            {state !== "failed" && (
              <Image
                src={screenshotUrl(url, width, height)}
                width={width}
                height={height}
                quality={60}
                alt={`Screenshot of ${host}`}
                onLoad={() => setState("loaded")}
                onError={() => setState("failed")}
                className={cn(
                  "relative rounded-md transition-opacity duration-200",
                  state === "loaded" ? "opacity-100" : "opacity-0",
                )}
              />
            )}
          </div>
          <p className="truncate px-1 pt-1 label-caps">{host}</p>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  )
}
