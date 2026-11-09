import type { Status } from "@/lib/status"
import { cn } from "@/lib/utils"
import { Container } from "./layout"
import { StatusDot } from "./status-dot"

interface SystemBarProps {
  status?: Status
  message?: string
  className?: string
}

/** Thin status strip at the very top of the page, with the deployed build's short SHA. */
export function SystemBar({
  status = "up",
  message = "all systems operational",
  className,
}: SystemBarProps) {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)
  return (
    <div className={cn("border-b bg-surface", className)}>
      <Container className="flex h-8 items-center justify-between gap-4 label-caps">
        <span className="flex items-center gap-2">
          <StatusDot status={status} pulse={status === "up"} />
          {message}
        </span>
        <span className="hidden sm:inline">build {sha ?? "local"}</span>
      </Container>
    </div>
  )
}
