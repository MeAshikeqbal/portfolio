import { formatDate } from "@/lib/format"
import { syncStatus, type Status } from "@/lib/status"
import { cn } from "@/lib/utils"
import { Container } from "./layout"
import { StatusDot } from "./status-dot"
import { SyncIndicator } from "./sync-indicator"

interface SystemBarProps {
  /** When the GitHub sync last wrote to a project; null until it has run. */
  syncedAt?: string | null
  /** Publish date of the newest post. */
  latestPostAt?: string | null
  /** A fact about the current page that outranks the rest, e.g. a 404. */
  notice?: { status: Status; label: string }
  className?: string
}

/**
 * Thin strip at the very top of the page. It only reports measured facts: the GitHub sync's
 * health (re-checked in the browser, so a stale static page can't keep showing green), the
 * newest post, and the deployed build.
 */
export function SystemBar({ syncedAt, latestPostAt, notice, className }: SystemBarProps) {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)
  const builtOn = formatDate(process.env.BUILD_TIME)
  const lastPost = formatDate(latestPostAt)

  return (
    <div className={cn("border-b bg-surface", className)}>
      <Container className="flex h-8 items-center justify-between gap-4 label-caps">
        <span className="flex min-w-0 items-center gap-3">
          {notice && (
            <span className="flex shrink-0 items-center gap-2">
              <StatusDot status={notice.status} />
              {notice.label}
            </span>
          )}
          {!notice && syncedAt && (
            <SyncIndicator syncedAt={syncedAt} initial={syncStatus(syncedAt)} />
          )}
          {!notice && lastPost && (
            <span className={cn("truncate", syncedAt && "hidden sm:inline")}>
              last post · <time dateTime={latestPostAt ?? undefined}>{lastPost}</time>
            </span>
          )}
        </span>
        <span className="hidden shrink-0 sm:inline">
          build {sha ?? "local"}
          {builtOn && ` · ${builtOn}`}
        </span>
      </Container>
    </div>
  )
}
