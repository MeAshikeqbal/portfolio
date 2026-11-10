import { cn } from "@/lib/utils"

/**
 * A thin usage bar in neutral ink (colour stays for status; the health pill beside it carries
 * that). The value is always printed next to it, so the bar is never the only way to read it.
 */
export function Meter({
  value,
  max,
  label,
  role = "meter",
  valueText,
  className,
}: {
  value: number
  max: number
  /** Accessible name, e.g. "Bulk storage used". */
  label: string
  /** "progressbar" for something advancing on its own (playback), "meter" for a level. */
  role?: "meter" | "progressbar"
  /** What a screen reader says instead of the percentage, e.g. "2:31 of 3:40". */
  valueText?: string
  className?: string
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  return (
    <span
      role={role}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText ?? `${Math.round(ratio * 100)}%`}
      className={cn("block h-1.5 w-24 overflow-hidden rounded-full bg-surface-2", className)}
    >
      <span
        className="block h-full rounded-full bg-chart-2"
        style={{ width: `${Math.max(ratio * 100, ratio > 0 ? 4 : 0)}%` }}
      />
    </span>
  )
}
