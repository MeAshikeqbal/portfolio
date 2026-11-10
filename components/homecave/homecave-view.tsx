import { isHomelab, UsesSections, visibleUsesSections } from "@/components/about/uses-view"
import { Container, Section } from "@/components/dashboard/layout"
import { SectionHeader } from "@/components/dashboard/section-header"
import type { LabStatus } from "@/lib/lab/types"
import type { USES_QUERY_RESULT } from "@/sanity.types"
import { LabDashboard, type NodeSpec } from "./lab-dashboard"

/**
 * Homecave: the homelab, live. The dashboard (nodes, storage, backups) comes from the lab's
 * signed, anonymized heartbeats; the copy around it (intro, node spec lines, self-hosted and
 * setup sections) from the Studio's Homecave document.
 */
export function HomecaveView({ uses, lab }: { uses: USES_QUERY_RESULT; lab: LabStatus | null }) {
  const sections = visibleUsesSections(uses)
  const homelab = sections.find((s) => isHomelab(s.title))
  const specs: NodeSpec[] = (homelab?.items ?? []).map((item) => ({
    name: item.name!.trim(),
    description: item.description ?? null,
  }))
  const rest = sections.filter((s) => s !== homelab)

  return (
    <main>
      <Section className="pt-12 sm:pt-16">
        <Container>
          <SectionHeader
            as="h1"
            title="Homecave"
            description={
              uses?.intro ??
              "My homelab, live: a small Proxmox cluster at home, and what runs on it."
            }
          />
          <LabDashboard initial={lab} specs={specs} />
        </Container>
      </Section>

      {rest.length > 0 && (
        <Section className="border-t">
          <Container className="max-w-4xl">
            <SectionHeader
              title="What runs here, and what I work with"
              description="The services in the lab, how it's reached, and the setup around it."
            />
            <UsesSections sections={rest} />
          </Container>
        </Section>
      )}

      <Section className="border-t">
        <Container className="max-w-4xl">
          <h2 className="text-lg font-semibold tracking-tight">What this page doesn&apos;t show</h2>
          <p className="mt-2 max-w-prose text-muted-foreground">
            Each node reports itself every 30 seconds, signed, and the lab only ever calls out:
            nothing here can reach into it. Before anything leaves, it&apos;s reduced to public
            names and rounded numbers. No hostnames, IP addresses, domains or software versions;
            containers and VMs are counted by category, never named; storage pools get plain labels;
            private projects only add to the counts.
          </p>
        </Container>
      </Section>
    </main>
  )
}
