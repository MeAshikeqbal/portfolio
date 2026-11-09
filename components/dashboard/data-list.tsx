import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import type { Status } from "@/lib/status"
import { cn } from "@/lib/utils"
import { StatusDot } from "./status-dot"

/** A dense list of "service rows", divided by hairlines. */
export function DataList({ className, children }: { className?: string; children: ReactNode }) {
  return <ul className={cn("divide-y", className)}>{children}</ul>
}

interface DataRowProps {
  title: ReactNode
  href?: string
  status?: { status: Status; label: string }
  description?: ReactNode
  /** Secondary facts (language, date…). Inline on wide screens, under the title on phones. */
  meta?: ReactNode[]
  /** Right-aligned value, e.g. a metric or a sparkline. */
  value?: ReactNode
  className?: string
}

export function DataRow({
  title,
  href,
  status,
  description,
  meta = [],
  value,
  className,
}: DataRowProps) {
  const external = Boolean(href && !href.startsWith("/"))
  const body = (
    <>
      {status && (
        <StatusDot status={status.status} label={status.label} className="mt-1.5 sm:mt-0" />
      )}
      <div className="min-w-0 flex-1">
        {/* Titles wrap rather than truncate: a cut-off name is no name at all. */}
        <div className="font-medium text-pretty">
          {title}
          {external && (
            <>
              <ArrowUpRight
                aria-hidden
                className="ml-1 inline size-3.5 align-[-0.125em] text-muted-foreground"
              />
              <span className="sr-only"> (opens in a new tab)</span>
            </>
          )}
        </div>
        {description && (
          // ~80 characters at text-sm: a readable measure even on wide rows.
          <p className="line-clamp-1 max-w-md text-sm text-muted-foreground">{description}</p>
        )}
        {meta.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-x-3 label-caps sm:hidden">
            {meta.map((item, i) => (
              <span key={i}>{item}</span>
            ))}
          </div>
        )}
      </div>
      {meta.length > 0 && (
        <div className="hidden shrink-0 items-center gap-4 label-caps sm:flex">
          {meta.map((item, i) => (
            <span key={i}>{item}</span>
          ))}
        </div>
      )}
      {value && <div className="shrink-0 text-right text-sm tabular">{value}</div>}
    </>
  )

  const rowClass = "flex items-start gap-3 px-4 py-3 sm:items-center"
  // Inset outline: rows live inside Panels, whose overflow-hidden would clip an outset ring.
  const linkClass = cn(
    rowClass,
    "transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:-outline-offset-2",
  )
  return (
    <li className={className}>
      {href && external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {body}
        </a>
      ) : href ? (
        <Link href={href} className={linkClass}>
          {body}
        </Link>
      ) : (
        <div className={rowClass}>{body}</div>
      )}
    </li>
  )
}
