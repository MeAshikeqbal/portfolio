import { STATUS_DOT_CLASS, type Status } from "@/lib/status"
import { cn } from "@/lib/utils"

interface StatusDotProps {
  status: Status
  /** Screen-reader text. Required unless a visible label sits next to the dot. */
  label?: string
  /** Gentle pulse for "live" indicators; disabled when the user prefers reduced motion. */
  pulse?: boolean
  className?: string
}

export function StatusDot({ status, label, pulse = false, className }: StatusDotProps) {
  return (
    <span className={cn("relative inline-flex size-2 shrink-0", className)}>
      <span
        aria-hidden
        className={cn(
          // A re-judged status (e.g. the sync going stale) shifts colour rather than flipping.
          "inline-flex size-full rounded-full transition-colors duration-500",
          STATUS_DOT_CLASS[status],
          pulse && "motion-safe:animate-pulse-dot",
        )}
      />
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}
