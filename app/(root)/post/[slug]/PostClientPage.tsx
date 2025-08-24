"use client"

import type { PortableTextBlock } from "@portabletext/types"
import Image from "next/image"
import { AlertCircle, CalendarIcon, TagIcon, Copy, Check } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BreadcrumbPost } from "@/components/post-breadcrumb"
import { TextToSpeech } from "@/components/TextToSpeech"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { useState } from "react"
import { urlFor } from "@/sanity/lib/image"
import { PortableText } from "@portabletext/react"

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
    <div className="relative group my-6">
      {filename && (
        <div className="bg-gray-800 text-gray-200 px-4 py-2 text-sm font-mono rounded-t-lg border-b border-gray-700">
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
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-700 hover:bg-gray-600 text-white h-8 w-8 p-1.5" // Adjusted padding and position slightly
          title="Copy code"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

/**
 * Renders a client-side blog post page including hero image, author meta, categories, optional audio playback, and the post body.
 *
 * The component displays a fullscreen hero image when `post.mainImage.asset._ref` is present, an author card with avatar and published date, a list of category badges, and a Portable Text-rendered body that supports headings, lists, blockquotes, links, emphasis, and both inline and block code (rendered via an internal `CodeBlock` component). If `post.audioUrl` is provided, a text-to-speech player is shown; otherwise an alert indicates audio is unavailable.
 *
 * @param post - The post object to render. Expected to contain fields used by this component such as `title`, optional `mainImage` (with `asset._ref`), optional `author` (with `name` and optional `image`), optional `categories`, optional `publishedAt`, optional `body` (Portable Text), optional `excerpt`, and optional `audioUrl`.
 * @returns A JSX element representing the full post page.
 */
export default function PostClientPage({ post }: { post: Post }) {
  return (
    <article className="max-w-full mx-auto pt-16">
      <div className="relative w-full h-[30vh] md:h-[40vh] lg:h-[70vh] mb-12">
        {post.mainImage?.asset?._ref && (
          <Image
            src={
              urlFor(post.mainImage.asset._ref).width(1920).height(1080).url() || "/placeholder.svg"
            }
            alt={post.mainImage.alt || post.title}
            style={{ objectFit: "cover" }}
            className="transition-transform duration-300"
            fill
            priority={true}
            quality={50}
          />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white text-center px-4 md:px-8 lg:px-16 max-w-4xl">
            {post.title}
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <div className="mb-8">
          <BreadcrumbPost postTitle={post.title} />
        </div>
        <Card className="mb-2 overflow-hidden shadow-lg">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12 border-2 border-primary">
                  <AvatarImage
                    src={post.author?.image ? urlFor(post.author.image).width(100).height(100).url() : undefined}
                    alt={post.author?.name || "Author"}
                  />
                  <AvatarFallback>
                    {post.author?.name ? post.author.name.slice(0, 2).toUpperCase() : "AU"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold text-foreground">{post.author?.name || "Unknown Author"}</p>
                  {post.publishedAt && (
                    <p className="text-sm text-muted-foreground flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-2" />
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
                <div className="flex flex-wrap gap-2 items-center">
                  <TagIcon className="w-4 h-4 text-muted-foreground" />
                  {post.categories.map((category, index) => (
                    <Badge key={index} variant="secondary" className="text-sm px-3 py-1">
                      {category.title}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        {post.audioUrl ? (
          <div className="my-8">
            <TextToSpeech
              title={post.title}
              subtitle={post.excerpt || "Listen to this post"}
              audioUrl={post.audioUrl}
              className="max-w-3xl mx-auto"
            />
          </div>
        ) : (
          <Alert variant="default" className="my-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Audio content for this post is not available at this moment.</AlertDescription>
          </Alert>
        )}
        <div className="prose prose-lg max-w-none dark:prose-invert mx-auto">
          <PortableText
            value={post.body || []}
            components={{
              block: {
                h1: ({ children }) => <h1 className="text-3xl font-bold mt-8 mb-4 text-primary">{children}</h1>,
                h2: ({ children }) => <h2 className="text-2xl font-semibold mt-6 mb-3 text-primary">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xl font-medium mt-4 mb-2 text-primary">{children}</h3>,
                normal: ({ children }) => (
                  <p className="mb-4 leading-relaxed text-foreground text-justify">{children}</p>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary pl-4 italic my-6 text-lg text-muted-foreground">
                    {children}
                  </blockquote>
                ),
              },
              list: {
                bullet: ({ children }) => <ul className="list-disc pl-6 mb-4 text-foreground">{children}</ul>,
                number: ({ children }) => <ol className="list-decimal pl-6 mb-4 text-foreground">{children}</ol>,
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
                    <code className="bg-gray-100 dark:bg-gray-700 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-md text-sm font-mono">
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
