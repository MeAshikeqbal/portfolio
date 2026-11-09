"use client"

import { ArrowUp } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

/**
 * Appears once the page is scrolled well down *and* the reader heads back up: that's when
 * they want it, and it never sits over content they're reading on the way down (on phones it
 * used to cover the right edge of rows).
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      // Ignore jitter (momentum, address-bar resizes) under a few pixels.
      if (Math.abs(y - last) < 4) return
      setVisible(y > 600 && y < last)
      last = y
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  if (!visible) return null

  const scrollToTop = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 rounded-full bg-surface/90 backdrop-blur"
      onClick={scrollToTop}
      aria-label="Back to top"
    >
      <ArrowUp />
    </Button>
  )
}
