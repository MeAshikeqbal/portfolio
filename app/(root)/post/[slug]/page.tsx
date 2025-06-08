import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { client } from "@/sanity/lib/client"
import { urlFor } from "@/sanity/lib/image"
import type { PortableTextBlock } from "@portabletext/types"
import PostClientPage from "./PostClientPage"

export const revalidate = 60

interface Author {
  name: string
  image?: {
    asset: {
      _ref: string
    }
  }
}

interface Post {
  title: string
  slug: {
    current: string
  }
  author?: Author
  mainImage?: {
    asset: {
      _ref: string
    }
    alt?: string
  }
  categories?: {
    title: string
  }[]
  publishedAt?: string
  body?: PortableTextBlock[]
  excerpt?: string
  audioUrl?: string
}

async function getPost(slug: string): Promise<Post | null> {
  return await client.fetch(
    `
    *[_type == "post"  && !(_id in path("drafts.**")) && slug.current == $slug][0]{
      title,
      slug,
      author->{
        name,
        image
      },
      mainImage,
      categories[]->{title},
      publishedAt,
      body,
      excerpt,
      "audioUrl": audioFile.asset->url
    }
  `,
    { slug },
  )
}

export async function generateMetadata({
  params,
}: { params: Promise<{ slug?: string }> }): Promise<Metadata | undefined> {
  const { slug } = await params

  if (!slug) {
    return {
      title: "Post Not Found",
    }
  }

  try {
    const post = await getPost(slug)

    if (!post) {
      return {
        title: "Post Not Found",
      }
    }

    return {
      title: post.title,
      description: post.excerpt || `Read ${post.title} by ${post.author?.name} on my blog`,
      openGraph: {
        title: post.title,
        description: post.excerpt || `Read ${post.title} by ${post.author?.name} on my blog`,
        type: "article",
        url: `https://itsashik.dev/post/${post.slug.current}`,
        images: post.mainImage
          ? [
              {
                url: urlFor(post.mainImage.asset._ref).width(1200).height(630).url(),
                width: 1200,
                height: 630,
                alt: post.mainImage.alt || post.title,
              },
            ]
          : [],
      },
    }
  } catch (error) {
    console.error("Failed to fetch post metadata:", error)
    return {
      title: "Error Loading Post",
    }
  }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  if (!slug) {
    notFound()
  }

  let post: Post | null = null
  try {
    post = await getPost(slug)
  } catch (error) {
    console.error("Failed to fetch post:", error)
  }

  if (!post) {
    notFound()
  }

  return <PostClientPage post={post} />
}
