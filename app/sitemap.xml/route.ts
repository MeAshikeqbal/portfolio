import { MetadataRoute } from "next";
import { NextResponse } from "next/server";
import { client } from "@/sanity/lib/client";

type BlogPost = {
  slug: string;
  publishedAt: string;
};

async function getBlogPosts(): Promise<BlogPost[]> {
  return client.fetch(`
    *[_type == "post"  && !(_id in path("drafts.**"))] {
      "slug": slug.current,
      publishedAt
    }
  `);
}

export async function GET(): Promise<NextResponse> {
  try {
    const blogPosts = await getBlogPosts();

    const sitemap: MetadataRoute.Sitemap = [
      {
        url: "https://www.itsashik.info",
        lastModified: new Date(),
      },
      {
        url: "https://www.itsashik.info/post",
        lastModified: new Date(),
      },
      {
        url: "https://www.itsashik.info/projects",
        lastModified: new Date(),
      },
      ...blogPosts.map((post) => ({
        url: `https://www.itsashik.info/post/${encodeURIComponent(post.slug)}`,
        lastModified: new Date(post.publishedAt),
      })),
    ];

    // Convert the sitemap object to XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap
  .map(
    (item) => `  <url>
    <loc>${item.url}</loc>
    <lastmod>${item.lastModified ? new Date(item.lastModified).toISOString() : new Date().toISOString()}</lastmod>
  </url>`
  )
  .join("\n")}
</urlset>`;

    // Return the XML as a NextResponse with correct headers
    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml",
        "X-Robots-Tag": "noindex",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return new NextResponse("Error generating sitemap", { status: 500 });
  }
}
