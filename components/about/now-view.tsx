import { PortableText } from "@portabletext/react"
import { MapPin } from "lucide-react"
import type { ReactNode } from "react"
import { Container, Section } from "@/components/dashboard/layout"
import { SectionHeader } from "@/components/dashboard/section-header"
import { StatusPill } from "@/components/dashboard/status-pill"
import { portableTextComponents } from "@/components/portable-text/components"
import type { NOW_QUERY_RESULT } from "@/sanity.types"
import { formatDate } from "@/lib/format"
import { siteConfig } from "@/lib/site"
import { isStale } from "@/lib/staleness"

type Now = NonNullable<NOW_QUERY_RESULT>

/**
 * The /now page body: a dated status update. The date pill turns amber ("stale") once the
 * page hasn't been edited for `siteConfig.nowStaleAfterDays` – age is measured, so it may
 * carry a status colour. `today` is injectable for tests.
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
  const updated = formatDate(now._updatedAt)
  const stale = isStale(now._updatedAt, today, siteConfig.nowStaleAfterDays)
  return (
    <main>
      <Section className="pt-12 sm:pt-16">
        <Container className="max-w-3xl">
          <SectionHeader as="h1" title="Now" />
          <div className="-mt-2 mb-8 flex flex-wrap items-center gap-3">
            {updated && (
              <StatusPill status={stale ? "warn" : "info"}>
                updated {updated}
                {stale && " · stale"}
              </StatusPill>
            )}
            {now.location?.trim() && (
              <span className="flex items-center gap-1 label-caps">
                <MapPin className="size-3.5" aria-hidden /> {now.location}
              </span>
            )}
          </div>
          <article className="prose prose-lg max-w-none">
            <PortableText value={now.body ?? []} components={portableTextComponents} />
          </article>
          {live && (
            <section id="live" aria-label="Live activity" className="mt-10 scroll-mt-24">
              {live}
            </section>
          )}
          <p className="mt-12 text-sm text-muted-foreground">
            This is a{" "}
            <a
              href="https://nownownow.com/about"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              now page
            </a>
            : what I&apos;m focused on at the moment.
          </p>
        </Container>
      </Section>
    </main>
  )
}
