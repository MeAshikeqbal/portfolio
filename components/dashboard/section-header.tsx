import { ArrowRight } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface SectionAction {
  href: string
  label: string
  /** Replaces the default arrow, e.g. an RSS icon. */
  icon?: ReactNode
}

interface SectionHeaderProps {
  /** Plain-language title, e.g. "Projects". The dashboard vocabulary lives in panel headers. */
  title: ReactNode
  description?: ReactNode
  actions?: SectionAction[]
  as?: "h1" | "h2" | "h3"
  className?: string
}

export function SectionHeader({
  title,
  description,
  actions = [],
  as: Heading = "h2",
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2", className)}>
      <div className="min-w-0">
        <Heading className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {title}
        </Heading>
        {description && <p className="mt-2 max-w-prose text-muted-foreground">{description}</p>}
      </div>
      {actions.length > 0 && (
        // Negative margin lines the text up with the content edge; the padding keeps 44px targets.
        <div className="-mx-2 flex flex-wrap items-center">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-4"
            >
              {action.icon}
              {action.label}
              {!action.icon && <ArrowRight aria-hidden />}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
