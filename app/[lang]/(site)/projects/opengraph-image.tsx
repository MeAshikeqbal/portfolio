import { getProjects } from "@/lib/api"
import { formatCompact } from "@/lib/format"
import { OG_CONTENT_TYPE, OG_SIZE, OG_STATUS_COLORS, OgFrame, ogResponse } from "@/lib/og"
import { siteConfig } from "@/lib/site"
import { projectStatus } from "@/lib/status"
import { routeTranslations } from "@/i18n/route-translations"
import { ogLocale, ogStaticParams, type OgParams } from "@/i18n/og"

export const alt = `Projects by ${siteConfig.name}`
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const generateStaticParams = ogStaticParams

/** The services index: how many, what state they're in, and how much work went in. */
export default async function Image({ params }: { params: OgParams }) {
  const locale = await ogLocale(params)
  const [projects, t, page] = await Promise.all([
    getProjects(locale),
    routeTranslations(locale, "og"),
    routeTranslations(locale, "projects"),
  ])
  const now = new Date()

  // Counted per visible label ("active", "maintained", "dormant", "archived"), most first.
  const counts = new Map<string, number>()
  for (const project of projects) {
    const status = projectStatus(project, now)
    if (status) counts.set(status.label, (counts.get(status.label) ?? 0) + 1)
  }
  const active = counts.get("active") ?? 0
  // "active" goes in the status bar with its green dot; the footer lists the rest.
  const states = [...counts]
    .filter(([label]) => label !== "active")
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, n]) => t("statusCount", { count: n, status: label }))

  const commits = projects.reduce((sum, p) => sum + (p.githubData?.commits ?? 0), 0)

  return ogResponse(
    <OgFrame
      eyebrow={t("projectsCount", { count: projects.length })}
      title={page("sectionTitle")}
      description={t("projectsDescription")}
      footer={[
        ...states.slice(0, 3),
        ...(commits > 0 ? [t("commitsYear", { count: formatCompact(commits, locale) })] : []),
      ]}
      // Green only for activity that's declared and measured; nothing is claimed otherwise.
      status={
        active > 0
          ? {
              color: OG_STATUS_COLORS.up,
              label: t("statusCount", { count: active, status: "active" }),
            }
          : undefined
      }
    />,
    locale,
  )
}
