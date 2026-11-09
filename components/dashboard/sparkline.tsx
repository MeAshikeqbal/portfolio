import { cn } from "@/lib/utils"

interface SparklineProps {
  values: readonly number[]
  /** Accessible summary, e.g. "Commits per week, last 12 weeks". Range and latest value are appended. */
  label: string
  width?: number
  height?: number
  className?: string
}

/** Builds the SVG path for a series scaled into the box. Exported for tests. */
export function sparklinePoints(values: readonly number[], width: number, height: number, pad = 3) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min
  const step = (width - pad * 2) / (values.length - 1)
  return values.map((value, i) => ({
    x: pad + i * step,
    // A flat series sits mid-height rather than on an edge.
    y: span === 0 ? height / 2 : pad + (1 - (value - min) / span) * (height - pad * 2),
  }))
}

/**
 * A tiny trend line for stat tiles and rows. The trend is muted ink and the latest point
 * is foreground. Status colours are reserved for state and never used here.
 * Server-rendered SVG with a text summary (no hover layer at this size).
 */
export function Sparkline({ values, label, width = 96, height = 24, className }: SparklineProps) {
  if (values.length < 2) return null

  const points = sparklinePoints(values, width, height)
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ")
  const last = points[points.length - 1]
  const summary = `${label}: from ${values[0]} to ${values[values.length - 1]}, peak ${Math.max(...values)}`

  return (
    <svg
      role="img"
      aria-label={summary}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("shrink-0 overflow-visible", className)}
    >
      <title>{summary}</title>
      <path
        d={d}
        fill="none"
        pathLength={1}
        className="sparkline-trace stroke-chart-2"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={last.x}
        cy={last.y}
        r={2.5}
        className="sparkline-head fill-chart-1 stroke-surface"
        strokeWidth={1}
      />
    </svg>
  )
}
