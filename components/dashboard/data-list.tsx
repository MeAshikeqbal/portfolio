import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { STATUS_TEXT_CLASS, type Status } from "@/lib/status"
import { cn } from "@/lib/utils"
import { StatusDot } from "./status-dot"

/** A dense list of "service rows", divided by hairlines. */
export function DataList({ className, children }: { className?: string; children: ReactNode }) {
  return <ul className={cn("divide-y", className)}>{children}</ul>
}

/** Where a row's status dot sits: by the title's first line on phones, centred on wide rows. */
const DOT_SLOT = "mt-1.5 sm:mt-0"

interface DataRowProps {
  title: ReactNode
  href?: string
  status?: { status: Status; label: string }
  description?: ReactNode
  /** Secondary facts (language, date…). Inline on wide screens, under the title on phones;
   * the status label, when there is one, always comes first. */
  meta?: ReactNode[]
  /** Right-aligned value, e.g. a metric or a sparkline. */
  value?: ReactNode
  /** A small plate before the title (artwork, an icon). It takes the dot's place, so the dot
   * moves in front of the status word. Greyscale art turns to colour on row hover via `group`. */
  leading?: ReactNode
  /** Keep the dot's slot when the row has no status, so its title lines up with dotted rows. */
  reserveDot?: boolean
  className?: string
}

export function DataRow({
  title,
  href,
  status,
  description,
  meta = [],
  value,
  leading,
  reserveDot = false,
  className,
}: DataRowProps) {
  const external = Boolean(href && !href.startsWith("/"))
  // The Label Carries It: the status is spelled out in the row's metadata, in its own colour,
  // so the dot is only a scanning aid (and screen readers hear the word, once).
  const facts: ReactNode[] = status
    ? [
        <span
          key="status"
          className={cn(
            STATUS_TEXT_CLASS[status.status],
            leading && "inline-flex items-center gap-1.5",
          )}
        >
          {leading && <StatusDot status={status.status} pulse={status.status === "up"} />}
          {status.label}
        </span>,
        ...meta,
      ]
    : meta
  const body = (
    <>
      {leading ??
        (status ? (
          <StatusDot status={status.status} className={DOT_SLOT} />
        ) : (
          reserveDot && <span aria-hidden className={cn("size-2 shrink-0", DOT_SLOT)} />
        ))}
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
        {facts.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-x-3 label-caps sm:hidden">
            {facts.map((item, i) => (
              <span key={i}>{item}</span>
            ))}
          </div>
        )}
      </div>
      {facts.length > 0 && (
        <div className="hidden shrink-0 items-center gap-4 label-caps sm:flex">
          {facts.map((item, i) => (
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
    "group transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:-outline-offset-2",
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
