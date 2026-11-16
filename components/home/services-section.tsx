import { DataList, DataRow } from "@/components/dashboard/data-list"
import { Container, Section } from "@/components/dashboard/layout"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { SectionHeader } from "@/components/dashboard/section-header"
import { Sparkline } from "@/components/dashboard/sparkline"
import { TraceOnView } from "@/components/dashboard/trace-on-view"
import { getLocale, getTranslations } from "next-intl/server"
import { getProjects } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { byActivity, hasActivity, projectHref, projectMeta } from "@/lib/projects"
import { projectStatus } from "@/lib/status"

export async function ServicesSection() {
  const locale = await getLocale()
  const [projects, t] = await Promise.all([getProjects(locale), getTranslations("projects")])
  if (projects.length === 0) return null
  const metaLabels = {
    locale,
    commits: (count: number) => t("commits", { count }),
    pushed: (date: string) => t("pushed", { date }),
  }
  const translatedStatus = (project: (typeof projects)[number]) => {
    const status = projectStatus(project)
    return status ? { ...status, label: t("status", { status: status.label }) } : undefined
  }

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
          title={t("sectionTitle")}
          description={t("sectionDescription")}
          actions={[{ href: "/projects", label: t("allProjects", { count: projects.length }) }]}
        />
        <Panel>
          <PanelHeader
            title={t("services", { shown: selected.length, total: projects.length })}
            meta={
              <>
                {hasTrends && <span className="hidden sm:inline">{t("commitsWeek")}</span>}
                {syncedAt && (
                  <span>
                    {t.rich("synced", {
                      time: () => <time dateTime={syncedAt}>{formatDate(syncedAt, locale)}</time>,
                    })}
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
                    title={project.title ?? t("untitled")}
                    status={translatedStatus(project)}
                    description={project.description}
                    meta={projectMeta(project, metaLabels)}
                    value={
                      // Only draw a trend that has something in it; the push date is in the meta.
                      hasActivity(weekly) ? (
                        <Sparkline
                          values={weekly}
                          label={t("commitsPerWeekLast", {
                            title: project.title ?? "",
                            weeks: weekly.length,
                          })}
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
