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
        <div className="rounded-t-lg border border-b-0 bg-surface-2 px-4 py-2 font-mono text-xs text-muted-foreground">
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
            fontFamily: "var(--font-mono)",
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
          className="absolute top-3 right-3 h-8 w-8 border bg-surface/90 p-1.5 text-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface focus-visible:opacity-100"
          title="Copy code"
          aria-label={copied ? "Copied" : "Copy code"}
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
          <PortableText
            value={post.body || []}
            components={{
              block: {
                // A code-block annotation renders a <div>, which can't live inside a <p>
                // (invalid HTML → hydration error), so those paragraphs render as <div>.
                normal: ({ value, children }) =>
                  value.markDefs?.some(
                    (def) => def._type === "code" && typeof def.code === "string",
                  ) ? (
                    <div className="my-5">{children}</div>
                  ) : (
                    <p>{children}</p>
                  ),
              },
              marks: {
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
                  // Inline code: styled by the prose tokens in app/globals.css.
                  return <code>{children}</code>
                },
                link: ({ value, children }) => {
                  if (value?.href) {
                    const target = value.href.startsWith("http") ? "_blank" : undefined
                    return (
                      <a
                        href={value.href}
                        target={target}
                        rel={target === "_blank" ? "noopener noreferrer" : undefined}
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
