"use client"

import Image from "next/image"
import { useState } from "react"
import { cn } from "@/lib/utils"

/**
 * A coverless project's live-site screenshot. If the capture fails to load, the whole figure
 * goes away rather than leaving a broken image under a "live site" caption.
 */
export function LiveSiteShot({
  src,
  host,
  className,
}: {
  src: string
  host: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <figure className={cn(className)}>
      <Image
        src={src}
        alt={`Screenshot of ${host}`}
        width={1792}
        height={1120}
        className="h-auto w-full rounded-lg border bg-surface-2"
        sizes="(min-width: 1024px) 1024px, 100vw"
        onError={() => setFailed(true)}
      />
      <figcaption className="mt-2 label-caps">live site · {host}</figcaption>
    </figure>
  )
}
