import { PortableText } from "@portabletext/react"
import { ChevronRight } from "lucide-react"
import type { ReactNode } from "react"
import { Container, Section } from "@/components/dashboard/layout"
import { SectionHeader } from "@/components/dashboard/section-header"
import { StatusDot } from "@/components/dashboard/status-dot"
import { portableTextComponents } from "@/components/portable-text/components"
import type { NOW_QUERY_RESULT } from "@/sanity.types"
import { formatDate, trimText } from "@/lib/format"
import { toPlainText } from "@/lib/portable-text"
import { siteConfig } from "@/lib/site"
import { isStale } from "@/lib/staleness"

type Now = NonNullable<NOW_QUERY_RESULT>
type Entry = NonNullable<Now["archive"]>[number]

const LINK =
  "underline decoration-border underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"

/**
 * Date and place, in the metadata voice the post header uses. Age is measured, so a stale
 * update says so first, as a status word in its colour with the dot beside it.
 */
function MetaLine({
  updated,
  location,
  stale,
}: {
  updated: string
  location?: string | null
  stale: boolean
}) {
  const date = formatDate(updated)
  return (
    <p className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-1 label-caps">
      {stale && (
        <span className="inline-flex items-center gap-1.5 text-status-warn-fg">
          <StatusDot status="warn" />
          stale
        </span>
      )}
      {date && (
        <span>
          updated <time dateTime={updated}>{date}</time>
        </span>
      )}
      {location?.trim() && <span>{location}</span>}
    </p>
  )
}

/** One archived update: its date and opening words, the whole text a click away. */
function PreviousUpdate({ entry }: { entry: Entry }) {
  const opening = trimText(toPlainText(entry.body), 90)
  return (
    <li>
      <details className="group">
        <summary className="-mx-2 flex min-h-11 cursor-pointer list-none items-center gap-x-3 rounded-sm px-2 py-2 transition-colors hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
          <ChevronRight
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90 motion-reduce:transition-none"
          />
          <time
            dateTime={entry.date ?? undefined}
            className="w-28 shrink-0 label-caps text-foreground"
          >
            {formatDate(entry.date)}
          </time>
          {opening && (
            // The opening line is a preview; once open, the full text below replaces it.
            <span className="min-w-0 truncate text-sm text-muted-foreground group-open:invisible">
              {opening}
            </span>
          )}
        </summary>
        <div className="pt-2 pb-6 pl-7">
          {entry.location?.trim() && <p className="mb-3 label-caps">{entry.location}</p>}
          <div className="prose max-w-none">
            <PortableText value={entry.body ?? []} components={portableTextComponents} />
          </div>
        </div>
      </details>
    </li>
  )
}

/**
 * The /now page, after nownownow.com: the current update in prose, live activity under it, then
 * every earlier update, newest first. The "stale" mark appears once the update is older than
 * `siteConfig.nowStaleAfterDays`. `today` is injectable for tests.
 */
export function NowView({
  now,
  today = new Date(),
  live,
}: {
  now: Now
  today?: Date
  /** Live activity, rendered client-side under the update (see components/live). */
  live?: ReactNode
}) {
  const stale = isStale(now.updated, today, siteConfig.nowStaleAfterDays)
  const archive = (now.archive ?? []).filter((entry) => entry.date && entry.body?.length)
  return (
    <main>
      <Section className="pt-12 sm:pt-16">
        <Container className="max-w-3xl">
          <SectionHeader
            as="h1"
            title="Now"
            className="mb-3"
            description={
              <>
                What I&apos;m focused on at the moment. A{" "}
                <a
                  href="https://nownownow.com/about"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={LINK}
                >
                  now page
                </a>
                , an idea from Derek Sivers.
              </>
            }
          />
          <MetaLine updated={now.updated} location={now.location} stale={stale} />

          <article className="prose prose-lg max-w-none">
            <PortableText value={now.body ?? []} components={portableTextComponents} />
          </article>

          {live && (
            <section id="live" aria-label="Live activity" className="mt-12 scroll-mt-20">
              {live}
            </section>
          )}

          {archive.length > 0 && (
            <section aria-labelledby="now-history" className="mt-12">
              <h2 id="now-history" className="text-lg font-semibold tracking-tight">
                Previous updates
              </h2>
              <ol className="mt-3 divide-y border-y">
                {archive.map((entry) => (
                  <PreviousUpdate key={entry._key} entry={entry} />
                ))}
              </ol>
            </section>
          )}
        </Container>
      </Section>
    </main>
  )
}
