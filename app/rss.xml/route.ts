import RSS from 'rss'
import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'
import { absoluteUrl, siteConfig } from '@/lib/site'

type BlogPost = {
  slug: string
  title: string
  publishedAt: string
  author: {
    name: string
  }
  mainImage: {
    asset: {
      url: string
    }
  }
}

async function getBlogPosts(): Promise<BlogPost[]> {
  return client.fetch(`
    *[_type == "post"  && !(_id in path("drafts.**"))] {
      "slug": slug.current,
      title,
      publishedAt,
      author->{name},
      mainImage{
        asset->{
          url
        }
      }
    }
  `)
}

export async function GET() {
  const blogPosts = await getBlogPosts()

  const feed = new RSS({
    title: `${siteConfig.name} - Blog RSS Feed`,
    description: siteConfig.description,
    site_url: siteConfig.url,
    feed_url: absoluteUrl('/rss.xml'),
    language: 'en',
  })

  blogPosts.forEach((post) => {
    feed.item({
      title: post.title,
      description: post.author ? `By ${post.author.name}` : '',
      url: absoluteUrl(`/post/${post.slug}`),
      date: post.publishedAt,
      enclosure: post.mainImage ? {
        url: post.mainImage.asset.url,
        type: 'image/jpeg'
      } : undefined
    })
  })

  return new NextResponse(feed.xml({ indent: true }), {
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}