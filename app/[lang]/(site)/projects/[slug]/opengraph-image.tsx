import { getProject, getProjectSlugs } from "@/lib/api"
import {
  OG_COLORS,
  OG_CONTENT_TYPE,
  OG_STATUS_COLORS,
  OG_SIZE,
  OgFrame,
  ogFonts,
  ogResponse,
  sanityOgImage,
} from "@/lib/og"
import { siteConfig } from "@/lib/site"
import { projectStatus } from "@/lib/status"
import { routeTranslations } from "@/i18n/route-translations"
import { ogLocale } from "@/i18n/og"

export const alt = `Project by ${siteConfig.name}`
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

/** Prerender a card for every page that's prerendered; new slugs render on demand. */
export async function generateStaticParams() {
  const slugs = await getProjectSlugs()
  return slugs.map((slug) => ({ slug }))
}

export default async function Image({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>
}) {
  const { slug } = await params
  const locale = await ogLocale(params)
  const [project, t, projects] = await Promise.all([
    getProject(slug, locale),
    routeTranslations(locale, "og"),
    routeTranslations(locale, "projects"),
  ])

  if (project?.seo?.ogImage?.asset) {
    return sanityOgImage(project.seo.ogImage, await ogFonts())
  }

  if (!project?.title) {
    return ogResponse(
      <OgFrame
        eyebrow={t("project")}
        title={t("projectNotFound")}
        status={{ color: OG_COLORS.idle, label: t("http404") }}
      />,
      locale,
    )
  }

  const status = projectStatus(project)
  const gh = project.githubData
  const footer = [
    gh?.language,
    gh?.commits ? t("commits", { count: gh.commits }) : null,
    // Geist Mono has no ★ glyph (Satori would try to download a fallback font).
    gh?.stars ? t("stars", { count: gh.stars }) : null,
    gh?.license && gh.license !== "Not specified" ? gh.license : null,
  ].filter((item): item is string => Boolean(item))

  return ogResponse(
    <OgFrame
      eyebrow={status ? t("projectStatus", { status: status.label }) : t("project")}
      title={project.title}
      description={project.description}
      footer={footer}
      status={
        status
          ? {
              color: OG_STATUS_COLORS[status.status],
              label: projects("status", { status: status.label }),
            }
          : undefined
      }
    />,
    locale,
  )
}
