import { cn } from "@/lib/utils"

/**
 * A thin usage bar in neutral ink (colour stays for status; the health pill beside it carries
 * that). The value is always printed next to it, so the bar is never the only way to read it.
 */
export function Meter({
  value,
  max,
  label,
  className,
}: {
  value: number
  max: number
  /** Accessible name, e.g. "Bulk storage used". */
  label: string
  className?: string
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  return (
    <span
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${Math.round(ratio * 100)}%`}
      className={cn("block h-1.5 w-24 overflow-hidden rounded-full bg-surface-2", className)}
    >
      <span
        className="block h-full rounded-full bg-chart-2"
        style={{ width: `${Math.max(ratio * 100, ratio > 0 ? 4 : 0)}%` }}
      />
    </span>
  )
}
