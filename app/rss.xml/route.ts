import RSS from "rss"
import { portableTextToFeedHtml } from "@/lib/feed-html"
import { absoluteUrl, siteConfig } from "@/lib/site"
import { sanityFetch } from "@/sanity/lib/live"
import { FEED_POSTS_QUERY } from "@/sanity/lib/queries"

// Prerendered; refreshed by `<SanityLive />` tag revalidation and the Sanity webhook.
export const dynamic = "force-static"

export async function GET() {
  const { data: posts } = await sanityFetch({ query: FEED_POSTS_QUERY, stega: false })

  const feed = new RSS({
    title: `${siteConfig.name} · Writing`,
    description: siteConfig.description,
    site_url: siteConfig.url,
    feed_url: absoluteUrl("/rss.xml"),
    language: "en",
    image_url: absoluteUrl("/web-app-manifest-512x512.png"),
    ttl: 60,
    // Full post bodies, so readers don't have to click through.
    custom_namespaces: { content: "http://purl.org/rss/1.0/modules/content/" },
    pubDate: posts[0]?.publishedAt ?? undefined,
  })

  for (const post of posts) {
    feed.item({
      title: post.title ?? "Untitled",
      description: post.excerpt ?? "",
      url: absoluteUrl(`/post/${post.slug}`),
      guid: absoluteUrl(`/post/${post.slug}`),
      date: post.publishedAt ?? post._updatedAt,
      author: post.author?.name ?? siteConfig.name,
      categories: (post.categories ?? []).filter((c): c is string => Boolean(c)),
      custom_elements: [{ "content:encoded": { _cdata: portableTextToFeedHtml(post.body) } }],
      enclosure: post.image?.url
        ? { url: post.image.url, type: post.image.mimeType ?? "image/jpeg" }
        : undefined,
    })
  }

  return new Response(feed.xml({ indent: true }), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  })
}
