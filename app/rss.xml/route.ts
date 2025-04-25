import RSS from 'rss'
import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'

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
    title: 'Ashik Eqbal - Blog RSS Feed',
    description: 'Personal blog of Ashik Eqbal, a software engineer specializing in web development.',
    site_url: 'https://www.itsashik.dev',
    feed_url: 'https://www.itsashik.dev/rss.xml',
    language: 'en',
  })

  blogPosts.forEach((post) => {
    feed.item({
      title: post.title,
      description: post.author ? `By ${post.author.name}` : '',
      url: `https://www.itsashik.dev/post/${post.slug}`,
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