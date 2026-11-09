import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

/** Page-width wrapper: 72rem max, 16px gutters on phones. */
export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)} {...props} />
}

/** A page section with consistent vertical rhythm; `scroll-mt` clears the sticky header for anchor links. */
export function Section({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("scroll-mt-20 py-16 sm:py-24", className)} {...props} />
}

/** Faint dot grid that fades out downward. Place inside a `relative` parent. */
export function GridBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]",
        className,
      )}
    />
  )
}
