import { ChevronRight } from "lucide-react"
import {
  homelabSpecs,
  isHomelab,
  UsesSections,
  visibleUsesSections,
} from "@/components/about/uses-view"
import { Container, Section } from "@/components/dashboard/layout"
import { SectionHeader } from "@/components/dashboard/section-header"
import { LabServiceBadge } from "@/components/lab/lab-badges"
import { serviceState } from "@/lib/lab/services"
import type { LabStatus } from "@/lib/lab/types"
import type { USES_QUERY_RESULT } from "@/sanity.types"
import { cn } from "@/lib/utils"
import { LabDashboard, type NodeSpec } from "./lab-dashboard"

/** Sections about the lab itself (Self-hosted, Network & access); the rest is the desk setup. */
const isLabSection = (title: string | null | undefined) => /self-hosted|network/i.test(title ?? "")

type Sections = ReturnType<typeof visibleUsesSections>

/**
 * Deal panels into two stacks, each to the shorter one (by rows, plus one for its header), so a
 * short panel never sits under the gap a tall neighbour leaves in a row-by-row grid.
 */
function balance(sections: Sections): Sections[] {
  const columns: Sections[] = [[], []]
  const heights = [0, 0]
  for (const section of sections) {
    const i = heights[0] <= heights[1] ? 0 : 1
    columns[i].push(section)
    heights[i] += section.items.length + 1
  }
  return columns.filter((column) => column.length > 0)
}

/**
 * Homecave: the homelab, live. The dashboard (nodes, storage, backups) comes from the lab's
 * signed, anonymized heartbeats; the copy around it (intro, node role lines, self-hosted and
 * setup sections) from the Studio's Homecave document.
 */
export function HomecaveView({ uses, lab }: { uses: USES_QUERY_RESULT; lab: LabStatus | null }) {
  const sections = visibleUsesSections(uses)
  const homelab = sections.find((s) => isHomelab(s.title))
  const specs: NodeSpec[] = homelabSpecs(uses)
  const rest = sections.filter((s) => s !== homelab)
  const labSections = rest.filter((s) => isLabSection(s.title))
  const deskSections = rest.filter((s) => !isLabSection(s.title))
  // Server-side first answer for each service badge (same snapshot the dashboard renders).
  const renderedAt = new Date()
  const badge = (name: string) => (
    <LabServiceBadge name={name} initial={serviceState(name, lab, renderedAt)} />
  )

  return (
    <main>
      <Section className="pt-12 sm:pt-16">
        <Container>
          <SectionHeader
            as="h1"
            title="Homecave"
            description={
              uses?.intro ??
              "My homelab, live: a three-node Proxmox cluster at home, and what runs on it."
            }
          />
          <LabDashboard initial={lab} renderedAt={renderedAt.toISOString()} specs={specs} />
          {/* The privacy note sits with the numbers it qualifies, not at the foot of the page. */}
          <p className="mt-4 max-w-[65ch] text-sm text-pretty text-muted-foreground">
            <span className="font-medium text-foreground">What this doesn&apos;t show.</span> Each
            node reports itself every 30 seconds, signed, and the lab connects outward only: nothing
            here can reach into it. No hostnames, IP addresses, domains or software versions;
            containers and VMs are counted by category, never named; storage gets plain labels;
            numbers are rounded, and private projects only add to the counts.
          </p>
        </Container>
      </Section>

      {rest.length > 0 && (
        <Section className="border-t">
          <Container>
            {labSections.length > 0 && (
              <>
                <SectionHeader
                  title="What runs here"
                  description="The services on the cluster, and how they're reached."
                />
                <div className="grid items-start gap-6 lg:grid-cols-2">
                  {balance(labSections).map((column, i) => (
                    <UsesSections key={i} sections={column} badge={badge} />
                  ))}
                </div>
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
                  <h2 className="text-lg font-semibold tracking-tight">Desk &amp; tools</h2>
                  <span className="label-caps">{deskSections.map((s) => s.title).join(" · ")}</span>
                </summary>
                <div className="mt-4 grid items-start gap-6 lg:grid-cols-2">
                  {balance(deskSections).map((column, i) => (
                    <UsesSections key={i} sections={column} />
                  ))}
                </div>
              </details>
            )}
          </Container>
        </Section>
      )}
    </main>
  )
}
