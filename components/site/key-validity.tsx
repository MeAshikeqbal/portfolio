"use client"

import { StatusDot } from "@/components/dashboard/status-dot"
import { useHydrated } from "@/hooks/use-hydrated"
import { keyValidity } from "@/lib/pgp"
import { STATUS_TEXT_CLASS, type Status } from "@/lib/status"
import { cn } from "@/lib/utils"

interface KeyValidityProps {
  expiresAt: string | null
  /** The verdict when the page was rendered; used until the browser re-checks. */
  initial: { status: Status; label: string }
  className?: string
}

/**
 * The signing key's validity: "valid until …" (green), "expires in 23d" (amber), "expired …"
 * (red). Pages are static, so after hydration it is re-judged against the visitor's clock.
 */
export function KeyValidity({ expiresAt, initial, className }: KeyValidityProps) {
  const hydrated = useHydrated()
  const current = hydrated ? keyValidity(expiresAt) : initial

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2",
        current.status !== "up" && STATUS_TEXT_CLASS[current.status],
        className,
      )}
    >
      <StatusDot status={current.status} />
      {current.label}
    </span>
  )
}
