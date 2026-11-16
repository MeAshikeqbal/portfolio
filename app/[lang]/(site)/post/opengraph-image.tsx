import { getPosts } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { OG_CONTENT_TYPE, OG_SIZE, OgFrame, ogResponse } from "@/lib/og"
import { siteConfig } from "@/lib/site"
import { routeTranslations } from "@/i18n/route-translations"
import { ogLocale, ogStaticParams, type OgParams } from "@/i18n/og"

export const alt = `Writing by ${siteConfig.name}`
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const generateStaticParams = ogStaticParams

/** The writing index: how much there is, how recent, and what it's mostly about. */
export default async function Image({ params }: { params: OgParams }) {
  const locale = await ogLocale(params)
  const [posts, t, writing] = await Promise.all([
    getPosts(),
    routeTranslations(locale, "og"),
    routeTranslations(locale, "writing"),
  ])

  const counts = new Map<string, number>()
  for (const post of posts) {
    for (const category of post.categories ?? []) {
      if (category.title) counts.set(category.title, (counts.get(category.title) ?? 0) + 1)
    }
  }
  const topics = [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([title]) => `#${title.toLocaleLowerCase(locale)}`)

  // Newest first (POSTS_QUERY orders by publishedAt desc).
  const latest = formatDate(posts[0]?.publishedAt, locale)

  return ogResponse(
    <OgFrame
      eyebrow={t("writingCount", { count: posts.length })}
      title={writing("title")}
      description={t("writingDescription")}
      footer={[...(latest ? [t("latest", { date: latest })] : []), ...topics]}
    />,
    locale,
  )
}
