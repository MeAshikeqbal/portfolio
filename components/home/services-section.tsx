import { DataList, DataRow } from "@/components/dashboard/data-list"
import { Container, Section } from "@/components/dashboard/layout"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { SectionHeader } from "@/components/dashboard/section-header"
import { Sparkline } from "@/components/dashboard/sparkline"
import { getProjects } from "@/lib/api"
import { projectHref, projectMeta } from "@/lib/projects"
import { projectStatus } from "@/lib/status"

export async function ServicesSection() {
  const projects = await getProjects()
  const selected = [
    ...projects.filter((p) => p.featured),
    ...projects.filter((p) => !p.featured),
  ].slice(0, 6)
  const hasTrends = selected.some((p) => (p.githubData?.weeklyCommits?.length ?? 0) > 1)

  return (
    <Section id="services">
      <Container>
        <SectionHeader
          eyebrow="services"
          title="Projects"
          description="Things I've built and run. Stats sync from GitHub daily."
          action={{ href: "/projects", label: `all ${projects.length} projects` }}
        />
        <Panel>
          <PanelHeader
            title={`${selected.length} of ${projects.length} services`}
            meta={hasTrends ? <span>commits / wk</span> : undefined}
          />
          <DataList>
            {selected.map((project) => {
              const weekly = project.githubData?.weeklyCommits ?? []
              return (
                <DataRow
                  key={project._id}
                  href={projectHref(project)}
                  title={project.title ?? "Untitled project"}
                  status={projectStatus(project.status) ?? undefined}
                  description={project.description}
                  meta={projectMeta(project)}
                  value={
                    weekly.length > 1 ? (
                      <Sparkline
                        values={weekly}
                        label={`${project.title} commits per week, last ${weekly.length} weeks`}
                      />
                    ) : undefined
                  }
                />
              )
            })}
          </DataList>
        </Panel>
      </Container>
    </Section>
  )
}
