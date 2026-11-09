"use client"

import { usePathname } from "next/navigation"
import { StatusPill } from "@/components/dashboard/status-pill"
import { useHydrated } from "@/hooks/use-hydrated"

/**
 * Shown while draft mode is on, outside the Studio. (Inside Presentation's iframe the Studio
 * already makes the preview state obvious, so the banner stays hidden there.)
 */
export function DraftModeBanner() {
  const pathname = usePathname()
  const hydrated = useHydrated()
  if (!hydrated || window.self !== window.top) return null

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-full border bg-surface/95 py-1.5 pr-3 pl-1.5 shadow-md backdrop-blur">
      <StatusPill status="warn" pulse>
        draft preview
      </StatusPill>
      <a
        href={`/api/draft-mode/disable?redirect=${encodeURIComponent(pathname)}`}
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Exit
      </a>
    </div>
  )
}
