import type { ReactNode } from "react"
import { STATUS_PILL_CLASS, type Status } from "@/lib/status"
import { cn } from "@/lib/utils"
import { StatusDot } from "./status-dot"

interface StatusPillProps {
  status: Status
  children: ReactNode
  pulse?: boolean
  className?: string
}

/** Dot + visible label on a tinted background. The label carries the meaning; colour reinforces it. */
export function StatusPill({ status, children, pulse, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[0.6875rem] leading-4 tracking-[0.06em] uppercase",
        STATUS_PILL_CLASS[status],
        className,
      )}
    >
      <StatusDot status={status} pulse={pulse} className="size-1.5" />
      {children}
    </span>
  )
}
