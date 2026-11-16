"use client"

import { StatusDot } from "@/components/dashboard/status-dot"
import { useLocale, useTranslations } from "next-intl"
import { useHydrated } from "@/hooks/use-hydrated"
import { formatDate } from "@/lib/format"
import { keyValidity, type KeyValidityVerdict } from "@/lib/pgp"
import { STATUS_TEXT_CLASS } from "@/lib/status"
import { cn } from "@/lib/utils"

interface KeyValidityProps {
  expiresAt: string | null
  /** The verdict when the page was rendered; used until the browser re-checks. */
  initial: KeyValidityVerdict
  className?: string
}

/**
 * The signing key's validity: "valid until …" (green), "expires in 23d" (amber), "expired …"
 * (red). Pages are static, so after hydration it is re-judged against the visitor's clock.
 */
export function KeyValidity({ expiresAt, initial, className }: KeyValidityProps) {
  const t = useTranslations("footer")
  const locale = useLocale()
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
      {t(current.code, { days: current.days ?? 0, date: formatDate(current.date, locale) ?? "" })}
    </span>
  )
}
