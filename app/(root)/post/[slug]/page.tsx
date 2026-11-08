import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getPost, getPostSlugs } from "@/lib/api"
import { absoluteUrl } from "@/lib/site"
import { urlFor } from "@/sanity/lib/image"
import PostClientPage from "./PostClientPage"

type Props = { params: Promise<{ slug: string }> }

/** Prerender every published post at build time; new posts render on demand. */
export async function generateStaticParams() {
  const slugs = await getPostSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post?.title) {
    return { title: "Post Not Found" }
  }

  const description = post.excerpt || `Read ${post.title}${post.author?.name ? ` by ${post.author.name}` : ""}.`
  const image = post.mainImage?.asset
    ? {
        url: urlFor(post.mainImage).width(1200).height(630).url(),
        width: 1200,
        height: 630,
        alt: post.mainImage.alt || post.title,
      }
    : undefined

  return {
    title: post.title,
    description,
    alternates: { canonical: `/post/${slug}` },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      url: absoluteUrl(`/post/${slug}`),
      publishedTime: post.publishedAt ?? undefined,
      authors: post.author?.name ? [post.author.name] : undefined,
      images: image ? [image] : [],
    },
  }
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post) {
    notFound()
  }

  return <PostClientPage post={post} />
}
