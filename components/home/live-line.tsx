"use client"

import Link from "next/link"
import { StatusDot } from "@/components/dashboard/status-dot"
import { pickLiveLine, type LiveLineContent } from "@/components/live/describe"
import { useLiveActivity } from "@/components/live/use-live-activity"

export function LiveLineView({ line }: { line: LiveLineContent }) {
  return (
    <Link
      href="/now#live"
      // Inset outline: this sits inside the hero panel, whose overflow-hidden would clip it.
      className="flex items-center gap-2 border-b px-4 py-2.5 text-sm transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:-outline-offset-2"
    >
      <StatusDot
        status={line.status}
        pulse={line.status === "up"}
        label={line.status === "up" ? "Now:" : "Earlier:"}
      />
      <span className="shrink-0 label-caps">{line.verb}</span>
      <span className="truncate text-muted-foreground">{line.text}</span>
    </Link>
  )
}

/** One line of live activity in the hero card, linking to the full panel on /now. */
export function LiveLine() {
  const line = pickLiveLine(useLiveActivity())
  return line ? <LiveLineView line={line} /> : null
}
