import { getHomeStats } from "@/lib/api"
import { formatCompact } from "@/lib/format"
import { OG_CONTENT_TYPE, OG_SIZE, OgFrame, ogResponse } from "@/lib/og"
import { siteConfig } from "@/lib/site"
import { routeTranslations } from "@/i18n/route-translations"
import { ogLocale, ogStaticParams, type OgParams } from "@/i18n/og"

export const alt = `${siteConfig.name} — ${siteConfig.role}`
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const generateStaticParams = ogStaticParams

/** Default share card for every page without its own (home, /post, /projects…). */
export default async function Image({ params }: { params: OgParams }) {
  const locale = await ogLocale(params)
  const [stats, t, site] = await Promise.all([
    getHomeStats(),
    routeTranslations(locale, "og"),
    routeTranslations(locale, "site"),
  ])
  return ogResponse(
    <OgFrame
      eyebrow={site("role")}
      title={siteConfig.name}
      description={site("tagline")}
      footer={[
        t("posts", { count: stats.posts }),
        t("projects", { count: stats.projects }),
        ...(stats.commits > 0
          ? [t("commitsYear", { count: formatCompact(stats.commits, locale) })]
          : []),
      ]}
    />,
    locale,
  )
}
