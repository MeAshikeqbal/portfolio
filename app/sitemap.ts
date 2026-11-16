import type { MetadataRoute } from "next"
import { defaultLocale, type Locale } from "@/i18n/locales"
import { languageAlternates } from "@/lib/metadata"
import { absoluteUrl } from "@/lib/site"
import { sanityFetch } from "@/sanity/lib/live"
import { SITEMAP_QUERY } from "@/sanity/lib/queries"

type Entry = MetadataRoute.Sitemap[number]

/**
 * One sitemap entry per page, at its English (canonical) URL, listing the other languages it
 * exists in as hreflang alternates. Pages whose content isn't translated yet list English only.
 */
function entry(
  path: string,
  available: readonly Locale[] | undefined,
  rest: Omit<Entry, "url">,
): Entry {
  const languages = languageAlternates(path, available)
  return {
    url: absoluteUrl(path),
    ...rest,
    ...(languages && {
      alternates: {
        languages: Object.fromEntries(
          Object.entries(languages).map(([lang, href]) => [lang, absoluteUrl(href)]),
        ),
      },
    }),
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data } = await sanityFetch({ query: SITEMAP_QUERY, stega: false })
  const latestPost = data.posts[0]?._updatedAt ? new Date(data.posts[0]._updatedAt) : undefined
  // Post, project and /now bodies are still English everywhere: one canonical copy each.
  const english: readonly Locale[] = [defaultLocale]

  return [
    entry("/", undefined, { lastModified: latestPost, changeFrequency: "weekly", priority: 1 }),
    entry("/post", undefined, {
      lastModified: latestPost,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
    entry("/projects", undefined, { changeFrequency: "monthly", priority: 0.8 }),
    // Always there: the live homelab dashboard (its Sanity copy only adds context).
    entry("/homecave", undefined, { changeFrequency: "daily", priority: 0.6 }),
    ...(data.now
      ? [entry("/now", english, { lastModified: new Date(data.now), priority: 0.5 })]
      : []),
    ...data.projects.map((project) =>
      entry(`/projects/${encodeURIComponent(project.slug!)}`, english, {
        lastModified: new Date(project._updatedAt),
        changeFrequency: "monthly",
        priority: 0.6,
      }),
    ),
    ...data.posts.map((post) =>
      entry(`/post/${encodeURIComponent(post.slug!)}`, english, {
        lastModified: new Date(post._updatedAt),
        changeFrequency: "monthly",
        priority: 0.6,
      }),
    ),
  ]
}
