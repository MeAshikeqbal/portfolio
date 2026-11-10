import type { MetadataRoute } from "next"
import { absoluteUrl } from "@/lib/site"
import { sanityFetch } from "@/sanity/lib/live"
import { SITEMAP_QUERY } from "@/sanity/lib/queries"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data } = await sanityFetch({ query: SITEMAP_QUERY, stega: false })
  const latestPost = data.posts[0]?._updatedAt ? new Date(data.posts[0]._updatedAt) : undefined

  return [
    { url: absoluteUrl("/"), lastModified: latestPost, changeFrequency: "weekly", priority: 1 },
    {
      url: absoluteUrl("/post"),
      lastModified: latestPost,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    { url: absoluteUrl("/projects"), changeFrequency: "monthly", priority: 0.8 },
    // Always there: the live homelab dashboard (its Sanity copy only adds context).
    { url: absoluteUrl("/homecave"), changeFrequency: "daily", priority: 0.6 },
    ...(data.now
      ? [{ url: absoluteUrl("/now"), lastModified: new Date(data.now), priority: 0.5 }]
      : []),
    ...data.projects.map((project) => ({
      url: absoluteUrl(`/projects/${encodeURIComponent(project.slug!)}`),
      lastModified: new Date(project._updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...data.posts.map((post) => ({
      url: absoluteUrl(`/post/${encodeURIComponent(post.slug!)}`),
      lastModified: new Date(post._updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ]
}
