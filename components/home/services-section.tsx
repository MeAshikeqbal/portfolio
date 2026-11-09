import { DataList, DataRow } from "@/components/dashboard/data-list"
import { Container, Section } from "@/components/dashboard/layout"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { SectionHeader } from "@/components/dashboard/section-header"
import { Sparkline } from "@/components/dashboard/sparkline"
import { TraceOnView } from "@/components/dashboard/trace-on-view"
import { MorphTitle } from "@/components/motion/morph-title"
import { getProjects } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { projectHref, projectMeta } from "@/lib/projects"
import { projectStatus } from "@/lib/status"

export async function ServicesSection() {
  const projects = await getProjects()
  if (projects.length === 0) return null

  const selected = [
    ...projects.filter((p) => p.featured),
    ...projects.filter((p) => !p.featured),
  ].slice(0, 6)
  const hasTrends = selected.some((p) => (p.githubData?.weeklyCommits?.length ?? 0) > 1)
  // Newest GitHub sync across all projects; absent until the sync has run.
  const syncedAt = projects
    .map((p) => p.githubData?.syncedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1)

  return (
    <Section id="services" className="border-t">
      <Container>
        <SectionHeader
          title="Projects"
          description="Things I've built and run."
          actions={[{ href: "/projects", label: `All ${projects.length} projects` }]}
        />
        <Panel>
          <PanelHeader
            title={`services · ${selected.length} of ${projects.length}`}
            meta={
              <>
                {hasTrends && <span className="hidden sm:inline">commits / wk</span>}
                {syncedAt && (
                  <span>
                    synced <time dateTime={syncedAt}>{formatDate(syncedAt)}</time>
                  </span>
                )}
              </>
            }
          />
          <TraceOnView>
            <DataList>
              {selected.map((project) => {
                const weekly = project.githubData?.weeklyCommits ?? []
                return (
                  <DataRow
                    key={project._id}
                    href={projectHref(project)}
                    title={
                      <MorphTitle kind="project" id={project.slug}>
                        {/* inline-block: a view-transition name can't sit on a wrapped inline box. */}
                        <span className="inline-block">{project.title ?? "Untitled project"}</span>
                      </MorphTitle>
                    }
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
          </TraceOnView>
        </Panel>
      </Container>
    </Section>
  )
}
