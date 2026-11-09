import { PortableText } from "@portabletext/react"
import { MapPin } from "lucide-react"
import { Container, Section } from "@/components/dashboard/layout"
import { SectionHeader } from "@/components/dashboard/section-header"
import { StatusPill } from "@/components/dashboard/status-pill"
import { portableTextComponents } from "@/components/portable-text/components"
import type { NOW_QUERY_RESULT } from "@/sanity.types"
import { formatDate } from "@/lib/format"

type Now = NonNullable<NOW_QUERY_RESULT>

/** The /now page body: a dated status update. */
export function NowView({ now }: { now: Now }) {
  return (
    <main>
      <Section className="pt-12 sm:pt-16">
        <Container className="max-w-3xl">
          <SectionHeader as="h1" eyebrow="status update" title="Now" />
          <div className="-mt-2 mb-8 flex flex-wrap items-center gap-3">
            <StatusPill status="info">updated {formatDate(now._updatedAt)}</StatusPill>
            {now.location && (
              <span className="flex items-center gap-1 label-caps">
                <MapPin className="size-3.5" aria-hidden /> {now.location}
              </span>
            )}
          </div>
          <article className="prose prose-lg max-w-none">
            <PortableText value={now.body ?? []} components={portableTextComponents} />
          </article>
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
