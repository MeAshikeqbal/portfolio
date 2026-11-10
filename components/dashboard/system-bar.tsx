import Link from "next/link"
import { LabBarItem } from "@/components/lab/lab-badges"
import { formatDate } from "@/lib/format"
import { siteConfig } from "@/lib/site"
import { syncStatus, type Status } from "@/lib/status"
import { cn } from "@/lib/utils"
import { Container } from "./layout"
import { RelativeTime } from "./relative-time"
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
 * One segment of the statusline. Every cell draws its own left hairline; the row starts 13px
 * (border + padding) to the left inside a clipping box, so whichever cell is first on screen
 * loses its hairline and lines up with the wordmark, even when earlier cells are hidden.
 */
const CELL = "shrink-0 items-center gap-2 border-l px-3"
// The strip clips its overflow, so the focus ring is drawn inside the link.
const CELL_LINK =
  "transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:-outline-offset-2"

/**
 * The statusline at the very top of the page, read like a terminal's: fixed cells split by
 * hairlines. It only reports measured facts: the GitHub sync's health (re-checked in the
 * browser, so a stale static page can't keep showing green), each homelab machine (once the
 * lab has reported), the newest post, and the deployed build, which links to its commit.
 */
export function SystemBar({ syncedAt, latestPostAt, notice, className }: SystemBarProps) {
  const fullSha = process.env.VERCEL_GIT_COMMIT_SHA
  const builtOn = formatDate(process.env.BUILD_TIME)

  return (
    // A labelled region, so the strip sits inside a landmark like the rest of the page.
    <section aria-label="Site status" className={cn("border-b bg-surface", className)}>
      <Container className="flex h-8 items-stretch label-caps">
        <div className="flex min-w-0 overflow-hidden">
          <div className="-ml-[13px] flex min-w-0 items-stretch">
            {notice ? (
              <span className={cn(CELL, "flex")}>
                <StatusDot status={notice.status} />
                {notice.label}
              </span>
            ) : (
              <>
                {syncedAt && (
                  <SyncIndicator
                    syncedAt={syncedAt}
                    initial={syncStatus(syncedAt)}
                    className={CELL}
                  />
                )}
                <LabBarItem className={cn(CELL, CELL_LINK, "hidden md:flex")} />
                {latestPostAt && (
                  <Link
                    href="/post"
                    className={cn(CELL, CELL_LINK, syncedAt ? "hidden sm:flex" : "flex")}
                  >
                    log · <RelativeTime iso={latestPostAt} />
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        <span className="ml-auto hidden shrink-0 items-center gap-1.5 border-l pl-3 sm:flex">
          build
          {fullSha ? (
            <a
              href={`${siteConfig.repo}/commit/${fullSha}`}
              className={cn(CELL_LINK, "underline decoration-border underline-offset-4")}
              title="This build's commit on GitHub"
            >
              {fullSha.slice(0, 7)}
            </a>
          ) : (
            <span>local</span>
          )}
          {builtOn && <span>· {builtOn}</span>}
        </span>
      </Container>
    </section>
  )
}
