import type { MetadataRoute } from "next"
import { absoluteUrl } from "@/lib/site"
import { sanityFetch } from "@/sanity/lib/live"
import { FEED_POSTS_QUERY } from "@/sanity/lib/queries"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: posts } = await sanityFetch({ query: FEED_POSTS_QUERY, stega: false })
  const latest = posts[0]?._updatedAt ? new Date(posts[0]._updatedAt) : new Date()

  return [
    { url: absoluteUrl("/"), lastModified: latest, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/post"), lastModified: latest, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/projects"), changeFrequency: "monthly", priority: 0.8 },
    ...posts.map((post) => ({
      url: absoluteUrl(`/post/${encodeURIComponent(post.slug!)}`),
      lastModified: new Date(post._updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ]
}
