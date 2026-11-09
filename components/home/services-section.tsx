import { DataList, DataRow } from "@/components/dashboard/data-list"
import { Container, Section } from "@/components/dashboard/layout"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { SectionHeader } from "@/components/dashboard/section-header"
import { Sparkline } from "@/components/dashboard/sparkline"
import { TraceOnView } from "@/components/dashboard/trace-on-view"
import { getProjects } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { byActivity, hasActivity, projectHref, projectMeta } from "@/lib/projects"
import { projectStatus } from "@/lib/status"

export async function ServicesSection() {
  const projects = await getProjects()
  if (projects.length === 0) return null

  // The six most recently pushed: the panel is an instrument, so it shows what's moving.
  const selected = byActivity(projects).slice(0, 6)
  const hasTrends = selected.some((p) => hasActivity(p.githubData?.weeklyCommits))
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
                    title={project.title ?? "Untitled project"}
                    status={projectStatus(project) ?? undefined}
                    description={project.description}
                    meta={projectMeta(project)}
                    value={
                      // Only draw a trend that has something in it; the push date is in the meta.
                      hasActivity(weekly) ? (
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
