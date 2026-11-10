import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** "641 KB/s" → the number at full size, the unit small after a real space; "6%" and "6d" stay whole. */
function WithUnit({ text }: { text: string }) {
  const match = /^([\d.,]+)\s+(.+)$/.exec(text)
  if (!match) return <>{text}</>
  return (
    <>
      {match[1]} <span className="text-xs font-normal text-muted-foreground">{match[2]}</span>
    </>
  )
}

/**
 * A flat metric cell for Homecave's in-panel grids (a `dl` with `gap-px bg-border`, so the
 * hairlines are single): label, value with a small unit, optional trend and one-line hint.
 */
export function Metric({
  label,
  value,
  hint,
  trend,
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  trend?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 bg-surface px-4 py-3", className)}>
      <dt className="label-caps">{label}</dt>
      <dd className="flex items-end justify-between gap-3">
        <span className="text-xl leading-none font-semibold tracking-tight whitespace-nowrap tabular">
          {typeof value === "string" ? <WithUnit text={value} /> : value}
        </span>
        {trend}
      </dd>
      {hint && <dd className="truncate text-xs text-muted-foreground tabular">{hint}</dd>}
    </div>
  )
}
