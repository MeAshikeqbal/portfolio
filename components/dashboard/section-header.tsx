import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SectionHeaderProps {
  /** Mono caps label in the dashboard vocabulary, e.g. "SERVICES". */
  eyebrow: string
  /** Plain-language title, so the metaphor never hides the meaning, e.g. "Projects". */
  title: ReactNode
  description?: ReactNode
  action?: { href: string; label: string }
  as?: "h1" | "h2" | "h3"
  className?: string
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  as: Heading = "h2",
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0">
        <p className="label-caps">{eyebrow}</p>
        <Heading className="mt-1 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {title}
        </Heading>
        {description && <p className="mt-2 max-w-prose text-muted-foreground">{description}</p>}
      </div>
      {action && (
        <Link href={action.href} className="label-caps transition-colors hover:text-foreground">
          {action.label} →
        </Link>
      )}
    </div>
  )
}
