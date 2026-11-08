import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface MetricTileProps {
  label: string
  value: ReactNode
  /** Small supporting text under the value, e.g. "last 12 months". */
  hint?: ReactNode
  /** Optional trend, typically a <Sparkline />. */
  trend?: ReactNode
  className?: string
}

/** A single headline number. Values use tabular figures so they don't jitter. */
export function MetricTile({ label, value, hint, trend, className }: MetricTileProps) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-lg border bg-surface p-4", className)}>
      <dt className="label-caps">{label}</dt>
      <dd className="flex items-end justify-between gap-3">
        <span className="text-2xl leading-none font-semibold tracking-tight tabular">{value}</span>
        {trend}
      </dd>
      {hint && <dd className="text-xs text-muted-foreground">{hint}</dd>}
    </div>
  )
}

/** Wraps MetricTiles in a description list grid. */
export function MetricGrid({ className, children }: { className?: string; children: ReactNode }) {
  return <dl className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>{children}</dl>
}
