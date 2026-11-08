"use client"

import type { Post } from "@/lib/api"
import Image from "next/image"
import { CalendarIcon, TagIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BreadcrumbPost } from "@/components/post-breadcrumb"
import { urlFor } from "@/sanity/lib/image"
import { PortableText } from "@portabletext/react"
import { portableTextComponents } from "@/components/portable-text/components"

/**
 * Renders a client-side blog post page including hero image, author meta, categories and the post body.
 *
 * The component displays a fullscreen hero image when `post.mainImage.asset` is present, an author card with avatar and published date, a list of category badges, and a Portable Text-rendered body that supports headings, lists, blockquotes, links, emphasis, and both inline and block code (rendered via an internal `CodeBlock` component).
 *
 * @param post - The post object to render. Expected to contain fields used by this component such as `title`, optional `mainImage` (with `asset._ref`), optional `author` (with `name` and optional `image`), optional `categories`, optional `publishedAt`, optional `body` (Portable Text), and optional `excerpt`.
 * @returns A JSX element representing the full post page.
 */
export default function PostClientPage({ post }: { post: Post }) {
  return (
    <article className="mx-auto max-w-full">
      <div className="relative mb-12 h-[30vh] w-full md:h-[40vh] lg:h-[70vh]">
        {post.mainImage?.asset && (
          <Image
            src={urlFor(post.mainImage).width(1920).height(1080).url()}
            alt={post.mainImage.alt || post.title || ""}
            style={{ objectFit: "cover" }}
            className="transition-transform duration-300"
            fill
            priority={true}
            quality={50}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-scrim">
          <h1 className="max-w-4xl px-4 text-center text-3xl font-semibold tracking-tight text-balance text-on-scrim md:px-8 md:text-4xl lg:px-16 lg:text-5xl">
            {post.title}
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 md:px-8">
        <div className="mb-8">
          <BreadcrumbPost postTitle={post.title ?? undefined} />
        </div>
        <Card className="mb-8 overflow-hidden">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12 border-2 border-primary">
                  <AvatarImage
                    src={
                      post.author?.image
                        ? urlFor(post.author.image).width(100).height(100).url()
                        : undefined
                    }
                    alt={post.author?.name || "Author"}
                  />
                  <AvatarFallback>
                    {post.author?.name ? post.author.name.slice(0, 2).toUpperCase() : "AU"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {post.author?.name || "Unknown Author"}
                  </p>
                  {post.publishedAt && (
                    <p className="flex items-center text-sm text-muted-foreground">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {new Date(post.publishedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>
              {post.categories && post.categories.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <TagIcon className="h-4 w-4 text-muted-foreground" />
                  {post.categories.map((category, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1 text-sm">
                      {category.title}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <div className="mx-auto prose prose-lg max-w-none">
          <PortableText value={post.body || []} components={portableTextComponents} />
        </div>
      </div>
    </article>
  )
}
