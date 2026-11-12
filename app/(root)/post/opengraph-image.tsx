import { ImageResponse } from "next/og"
import { getPosts } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { OG_CONTENT_TYPE, OG_SIZE, OgFrame, ogFonts } from "@/lib/og"
import { siteConfig } from "@/lib/site"

export const alt = `Writing by ${siteConfig.name}`
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

/** The writing index: how much there is, how recent, and what it's mostly about. */
export default async function Image() {
  const posts = await getPosts()

  const counts = new Map<string, number>()
  for (const post of posts) {
    for (const category of post.categories ?? []) {
      if (category.title) counts.set(category.title, (counts.get(category.title) ?? 0) + 1)
    }
  }
  const topics = [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([title]) => `#${title.toLowerCase()}`)

  // Newest first (POSTS_QUERY orders by publishedAt desc).
  const latest = formatDate(posts[0]?.publishedAt)

  return new ImageResponse(
    <OgFrame
      eyebrow={`writing · ${posts.length} ${posts.length === 1 ? "post" : "posts"}`}
      title="Writing"
      description="Notes on building, breaking and fixing things."
      footer={[...(latest ? [`latest ${latest}`] : []), ...topics]}
    />,
    { ...size, fonts: await ogFonts() },
  )
}
