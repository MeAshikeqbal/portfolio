"use client"

import type { Post } from "@/lib/api"
import Image from "next/image"
import { CalendarIcon, TagIcon, Copy, Check } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BreadcrumbPost } from "@/components/post-breadcrumb"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { useState } from "react"
import { urlFor } from "@/sanity/lib/image"
import { PortableText } from "@portabletext/react"

// Code Block Component
const CodeBlock = ({
  code, // Changed from children to a specific 'code' prop
  language = "plaintext", // Default to plaintext if not specified
  filename,
}: {
  code: string // Explicitly a string
  language?: string
  filename?: string
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy code:", err)
    }
  }

  return (
    <div className="group relative my-6">
      {filename && (
        <div className="rounded-t-lg border-b border-gray-700 bg-gray-800 px-4 py-2 font-mono text-sm text-gray-200">
          {filename}
        </div>
      )}
      <div className="relative">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          customStyle={{
            margin: 0,
            borderRadius: filename ? "0 0 0.5rem 0.5rem" : "0.5rem",
            fontSize: "0.875rem", // 14px
            padding: "1rem",
            lineHeight: "1.6", // Adjusted for better readability
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          }}
          showLineNumbers={true}
          wrapLongLines={true} // Kept as true, can be set to false for horizontal scrolling
          PreTag="div"
        >
          {code ? code.trim() : ""}
        </SyntaxHighlighter>

        <Button
          onClick={handleCopy}
          size="icon" // Changed for consistency if using Lucide icons
          variant="ghost"
          className="absolute top-3 right-3 h-8 w-8 bg-gray-700 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-600" // Adjusted padding and position slightly
          title="Copy code"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

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
    <article className="mx-auto max-w-full pt-16">
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
        <div className="bg-opacity-50 absolute inset-0 flex items-center justify-center bg-black">
          <h1 className="max-w-4xl px-4 text-center text-3xl font-bold text-white md:px-8 md:text-4xl lg:px-16 lg:text-5xl">
            {post.title}
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 md:px-8">
        <div className="mb-8">
          <BreadcrumbPost postTitle={post.title ?? undefined} />
        </div>
        <Card className="mb-2 overflow-hidden shadow-lg">
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
        <div className="mx-auto prose prose-lg max-w-none dark:prose-invert">
          <PortableText
            value={post.body || []}
            components={{
              block: {
                h1: ({ children }) => (
                  <h1 className="mt-8 mb-4 text-3xl font-bold text-primary">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mt-6 mb-3 text-2xl font-semibold text-primary">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mt-4 mb-2 text-xl font-medium text-primary">{children}</h3>
                ),
                normal: ({ children }) => (
                  <p className="mb-4 text-justify leading-relaxed text-foreground">{children}</p>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-6 border-l-4 border-primary pl-4 text-lg text-muted-foreground italic">
                    {children}
                  </blockquote>
                ),
              },
              list: {
                bullet: ({ children }) => (
                  <ul className="mb-4 list-disc pl-6 text-foreground">{children}</ul>
                ),
                number: ({ children }) => (
                  <ol className="mb-4 list-decimal pl-6 text-foreground">{children}</ol>
                ),
              },
              listItem: {
                bullet: ({ children }) => <li className="mb-2 text-justify">{children}</li>,
                number: ({ children }) => <li className="mb-2 text-justify">{children}</li>,
              },
              marks: {
                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ value, children }) => {
                  // 'value' is the annotation object from Sanity.
                  // It should contain 'code', 'language', 'filename' because the annotation's 'type' is 'code'.
                  // 'children' is the raw text that was selected in the editor.
                  if (value && typeof value.code === "string") {
                    return (
                      <CodeBlock
                        code={value.code}
                        language={(value.language as string) || "plaintext"}
                        filename={value.filename as string | undefined}
                      />
                    )
                  }
                  // Fallback for inline code if value.code is not available (renders simple inline style)
                  return (
                    <code className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-red-600 dark:bg-gray-700 dark:text-red-400">
                      {children}
                    </code>
                  )
                },
                link: ({ value, children }) => {
                  if (value?.href) {
                    const target = value.href.startsWith("http") ? "_blank" : undefined
                    return (
                      <a
                        href={value.href}
                        target={target}
                        rel={target === "_blank" ? "noopener noreferrer" : undefined}
                        className="text-blue-600 hover:underline"
                      >
                        {children}
                      </a>
                    )
                  }
                  return <span>{children}</span>
                },
              },
              // If you also use the Sanity 'code' type as a BLOCK element (not just a mark),
              // you would add a serializer here under 'types':
              // types: {
              //   code: ({ value }) => {
              //     if (!value || !value.code) return null;
              //     return (
              //       <CodeBlock
              //         code={value.code}
              //         language={value.language}
              //         filename={value.filename}
              //       />
              //     );
              //   },
              //   // other custom block type serializers
              // }
            }}
          />
        </div>
      </div>
    </article>
  )
}
