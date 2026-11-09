"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

/**
 * Plays the sparkline trace (app/globals.css, `[data-trace]`) once, when this block scrolls
 * into view. Lines start fully drawn: the trace is only armed after hydration, for a panel that
 * is still off screen and a visitor who hasn't asked for reduced motion.
 */
export function TraceOnView({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<"idle" | "armed" | "play">("idle")

  useEffect(() => {
    const element = ref.current
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    // Already on screen at load: the lines were seen drawn, so leave them be.
    const rect = element.getBoundingClientRect()
    if (rect.top < window.innerHeight && rect.bottom > 0) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setState("play")
        observer.disconnect()
      },
      { threshold: 0.35 },
    )
    setState("armed")
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} data-trace={state === "idle" ? undefined : state}>
      {children}
    </div>
  )
}
