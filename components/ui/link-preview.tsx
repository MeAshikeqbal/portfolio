"use client"

import Image from "next/image"
import { encode } from "qss"
import { HoverCard } from "radix-ui"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Microlink screenshot URL for a page, rendered at 3× the preview size and downscaled. */
export function microlinkScreenshot(url: string, width: number, height: number): string {
  return `https://api.microlink.io/?${encode({
    url,
    screenshot: true,
    meta: false,
    embed: "screenshot.url",
    colorScheme: "dark",
    "viewport.deviceScaleFactor": 0.5,
    "viewport.width": width * 3,
    "viewport.height": height * 3,
  })}`
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
 * never on page load, which keeps Microlink's free tier from rate-limiting. Touch devices
 * don't open hover cards, so they just get the link.
 */
export function LinkPreview({
  url,
  children,
  className,
  width = 240,
  height = 150,
}: LinkPreviewProps) {
  let host = url
  try {
    host = new URL(url).hostname
  } catch {
    // Keep the raw URL as the label.
  }

  return (
    <HoverCard.Root openDelay={300} closeDelay={100}>
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
          <Image
            src={microlinkScreenshot(url, width, height)}
            width={width}
            height={height}
            quality={60}
            alt={`Screenshot of ${host}`}
            className="rounded-md bg-surface-2"
          />
          <p className="truncate px-1 pt-1 label-caps">{host}</p>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  )
}
