import { cn } from "@/lib/utils"

/** Placeholder shape for content that is on its way. Decorative; pair it with text for status. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("rounded-md bg-surface-2 motion-safe:animate-pulse", className)}
      {...props}
    />
  )
}

export { Skeleton }
