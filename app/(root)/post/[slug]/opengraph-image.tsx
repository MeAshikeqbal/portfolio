import { ImageResponse } from "next/og"
import { getPost, getPostSlugs } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { OG_COLORS, OG_CONTENT_TYPE, OG_SIZE, OgFrame, ogFonts } from "@/lib/og"
import { readingTime } from "@/lib/portable-text"
import { siteConfig } from "@/lib/site"
import { urlFor } from "@/sanity/lib/image"

export const alt = `Blog post by ${siteConfig.name}`
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

/** Prerender a card for every page that's prerendered; new slugs render on demand. */
export async function generateStaticParams() {
  const slugs = await getPostSlugs()
  return slugs.map((slug) => ({ slug }))
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)
  const fonts = await ogFonts()

  // An explicit social image in the post's SEO settings wins over the generated card.
  if (post?.seo?.ogImage?.asset) {
    return new ImageResponse(
      <img
        src={urlFor(post.seo.ogImage).width(size.width).height(size.height).url()}
        width={size.width}
        height={size.height}
        alt=""
      />,
      { ...size, fonts },
    )
  }

  if (!post?.title) {
    return new ImageResponse(
      <OgFrame
        eyebrow="incident log"
        title="Post not found"
        status={{ color: OG_COLORS.idle, label: "http 404" }}
      />,
      { ...size, fonts },
    )
  }

  const eyebrow = [
    "incident log",
    formatDate(post.publishedAt),
    `${readingTime(post.body)} min read`,
  ]
    .filter(Boolean)
    .join(" · ")

  return new ImageResponse(
    <OgFrame
      eyebrow={eyebrow}
      title={post.title}
      description={post.excerpt}
      footer={(post.categories ?? []).flatMap((c) =>
        c.title ? [`#${c.title.toLowerCase()}`] : [],
      )}
    />,
    { ...size, fonts },
  )
}
