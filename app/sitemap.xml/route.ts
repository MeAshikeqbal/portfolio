import { MetadataRoute } from 'next'
import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'

type BlogPost = {
  slug: string
  publishedAt: string
}

async function getBlogPosts(): Promise<BlogPost[]> {
  return client.fetch(`
    *[_type == "post"] {
      "slug": slug.current,
      publishedAt
    }
  `)
}

export async function GET(): Promise<NextResponse> {
  const blogPosts = await getBlogPosts()

  const sitemap: MetadataRoute.Sitemap = [
    {
      url: 'https://www.itsashik.info',
      lastModified: new Date(),
    },
    {
      url: 'https://www.itsashik.info/post',
      lastModified: new Date(),
    },
    {
        url: 'https://www.itsashik.info/projects',
        lastModified: new Date(),
    },
    ...blogPosts.map((post) => ({
      url: `https://www.itsashik.info/post/${post.slug}`,
      lastModified: new Date(post.publishedAt),
    })),
  ]

  // Convert the sitemap object to XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${sitemap.map((item) => `
        <url>
          <loc>${item.url}</loc>
          <lastmod>${(item.lastModified ?? new Date()).toString()}</lastmod>
        </url>
      `).join('')}
    </urlset>`

  // Return the XML as a NextResponse
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}