import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"

/** The core dashboard container: a 1px-bordered surface. */
export function Panel({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="panel"
      className={cn("overflow-hidden rounded-lg border bg-surface text-foreground", className)}
      {...props}
    />
  )
}

interface PanelHeaderProps extends Omit<ComponentProps<"div">, "title"> {
  /** Rendered as a mono caps label. */
  title: ReactNode
  /** Right-aligned metadata or actions. */
  meta?: ReactNode
}

export function PanelHeader({ title, meta, className, ...props }: PanelHeaderProps) {
  return (
    <div
      data-slot="panel-header"
      className={cn(
        "flex min-h-10 items-center justify-between gap-3 border-b px-4 py-2",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-2 truncate label-caps">{title}</div>
      {meta && <div className="flex shrink-0 items-center gap-3 label-caps">{meta}</div>}
    </div>
  )
}

export function PanelBody({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="panel-body" className={cn("p-4", className)} {...props} />
}
