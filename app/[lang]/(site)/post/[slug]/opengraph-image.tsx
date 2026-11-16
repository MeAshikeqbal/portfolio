import { ImageResponse } from "next/og"
import { getPost, getPostSlugs } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { OG_COLORS, OG_CONTENT_TYPE, OG_SIZE, OgFrame, ogFonts, sanityOgImage } from "@/lib/og"
import { readingTime } from "@/lib/portable-text"
import { siteConfig } from "@/lib/site"
import { routeTranslations } from "@/i18n/route-translations"
import { ogLocale } from "@/i18n/og"

export const alt = `Blog post by ${siteConfig.name}`
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

/** Prerender a card for every page that's prerendered; new slugs render on demand. */
export async function generateStaticParams() {
  const slugs = await getPostSlugs()
  return slugs.map((slug) => ({ slug }))
}

export default async function Image({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>
}) {
  const { slug } = await params
  const locale = await ogLocale(params)
  const [post, fonts, t] = await Promise.all([
    getPost(slug),
    ogFonts(),
    routeTranslations(locale, "og"),
  ])

  // An explicit social image in the post's SEO settings wins over the generated card.
  if (post?.seo?.ogImage?.asset) {
    return sanityOgImage(post.seo.ogImage, fonts)
  }

  if (!post?.title) {
    return new ImageResponse(
      <OgFrame
        eyebrow={t("writing")}
        title={t("postNotFound")}
        status={{ color: OG_COLORS.idle, label: t("http404") }}
      />,
      { ...size, fonts },
    )
  }

  const eyebrow = [
    t("writing"),
    formatDate(post.publishedAt, locale),
    t("minRead", { minutes: readingTime(post.body) }),
  ]
    .filter(Boolean)
    .join(" · ")

  return new ImageResponse(
    <OgFrame
      eyebrow={eyebrow}
      title={post.title}
      description={post.excerpt}
      footer={(post.categories ?? []).flatMap((c) =>
        c.title ? [`#${c.title.toLocaleLowerCase(locale)}`] : [],
      )}
    />,
    { ...size, fonts },
  )
}
