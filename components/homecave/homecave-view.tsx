import { ChevronRight } from "lucide-react"
import {
  homelabSpecs,
  isHomelab,
  sectionKind,
  UsesSections,
  visibleUsesSections,
} from "@/components/about/uses-view"
import { Container, Section } from "@/components/dashboard/layout"
import { SectionHeader } from "@/components/dashboard/section-header"
import { LabServiceBadge } from "@/components/lab/lab-badges"
import { serviceState } from "@/lib/lab/services"
import type { LabReliability, Writeup } from "@/lib/lab/incidents"
import type { LabStatus } from "@/lib/lab/types"
import type { HOMECAVE_RECORD_QUERY_RESULT, USES_QUERY_RESULT } from "@/sanity.types"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { LabDashboard, type NodeSpec } from "./lab-dashboard"
import { LabRecord } from "./lab-record"

/** Sections about the lab itself (Self-hosted, Network & access); the rest is the desk setup. */
const isLabSection = (title: string | null | undefined) => /self-hosted|network/i.test(title ?? "")

/**
 * Homecave: the homelab, live. The dashboard (nodes, storage, backups) comes from the lab's
 * signed, anonymized heartbeats; the copy around it (intro, node role lines, self-hosted and
 * setup sections) from the Studio's Homecave document.
 */
export function HomecaveView({
  uses,
  lab,
  record = null,
  history = null,
}: {
  uses: USES_QUERY_RESULT
  lab: LabStatus | null
  /** Incidents and uptime from the lab's heartbeats; null when not configured. */
  record?: LabReliability | null
  /** The Studio's changelog and incident write-ups. */
  history?: HOMECAVE_RECORD_QUERY_RESULT | null
}) {
  const t = useTranslations("homecave")
  const sections = visibleUsesSections(uses)
  // Grouped by their English titles, so a translated page groups the same way.
  const kind = (section: (typeof sections)[number]) => sectionKind(uses, section)
  const homelab = sections.find((s) => isHomelab(kind(s)))
  const specs: NodeSpec[] = homelabSpecs(uses)
  const rest = sections.filter((s) => s !== homelab)
  const labSections = rest.filter((s) => isLabSection(kind(s)))
  const deskSections = rest.filter((s) => !isLabSection(kind(s)))
  // Server-side first answer for each service badge (same snapshot the dashboard renders).
  const renderedAt = new Date()
  const changes = history?.changes ?? []
  const writeups = (history?.writeups ?? []).filter((w): w is Writeup =>
    Boolean(w.slug && w.title && w.incident),
  )
  const badge = (name: string) => (
    <LabServiceBadge name={name} initial={serviceState(name, lab, renderedAt)} />
  )

  return (
    <main>
      <Section className="pt-12 sm:pt-16">
        <Container>
          <SectionHeader
            as="h1"
            title={t("title")}
            description={uses?.intro ?? t("introFallback")}
          />
          <LabDashboard initial={lab} renderedAt={renderedAt.toISOString()} specs={specs} />
          {/* The privacy note sits with the numbers it qualifies, not at the foot of the page. */}
          <p className="mt-4 max-w-[65ch] text-sm text-pretty text-muted-foreground">
            <span className="font-medium text-foreground">{t("privacyTitle")}</span>{" "}
            {t("privacyBody")}
          </p>
        </Container>
      </Section>

      {(record || changes.length > 0) && (
        <Section className="border-t">
          <Container>
            <SectionHeader title={t("recordTitle")} description={t("recordDescription")} />
            <LabRecord record={record} changes={changes} writeups={writeups} now={renderedAt} />
          </Container>
        </Section>
      )}

      {rest.length > 0 && (
        <Section className="border-t">
          <Container>
            {labSections.length > 0 && (
              <>
                <SectionHeader title={t("runsTitle")} description={t("runsDescription")} />
                <UsesSections sections={labSections} badge={badge} />
              </>
            )}
            {deskSections.length > 0 && (
              // The desk setup is secondary to the lab: one line until it's asked for.
              <details className={cn("group", labSections.length > 0 && "mt-10")}>
                <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-2 rounded-sm [&::-webkit-details-marker]:hidden">
                  <ChevronRight
                    aria-hidden
                    className="size-4 text-muted-foreground transition-transform group-open:rotate-90 motion-reduce:transition-none"
                  />
                  <h2 className="text-lg font-semibold tracking-tight">{t("desk")}</h2>
                  <span className="label-caps">{deskSections.map((s) => s.title).join(" · ")}</span>
                </summary>
                <UsesSections sections={deskSections} className="mt-4" />
              </details>
            )}
          </Container>
        </Section>
      )}
    </main>
  )
}
