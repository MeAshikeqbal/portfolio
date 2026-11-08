"use client"

import { useEffect, useState } from "react"

/** Thin bar at the top of the viewport showing how far through `targetId` the reader is. */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const target = document.getElementById(targetId)
    if (!target) return

    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect()
        const total = rect.height - window.innerHeight
        const read = total > 0 ? -rect.top / total : rect.top <= 0 ? 1 : 0
        setProgress(Math.min(1, Math.max(0, read)))
      })
    }

    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [targetId])

  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-foreground"
      style={{ transform: `scaleX(${progress})` }}
    />
  )
}
