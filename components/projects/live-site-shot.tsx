"use client"

import Image from "next/image"
import { useState } from "react"

/**
 * A coverless project's live-site screenshot. If the capture fails to load, the whole figure
 * goes away rather than leaving a broken image under a "live site" caption.
 */
export function LiveSiteShot({ src, host }: { src: string; host: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <figure className="mt-10">
      <Image
        src={src}
        alt={`Screenshot of ${host}`}
        width={1792}
        height={1120}
        className="rounded-lg border bg-surface-2"
        sizes="(min-width: 896px) 896px, 100vw"
        onError={() => setFailed(true)}
      />
      <figcaption className="mt-2 label-caps">live site · {host}</figcaption>
    </figure>
  )
}
