import { PortableText } from "@portabletext/react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ReadingProgress } from "@/components/blog/reading-progress"
import { TableOfContents } from "@/components/blog/table-of-contents"
import { DataList, DataRow } from "@/components/dashboard/data-list"
import { Container, GridBackdrop } from "@/components/dashboard/layout"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { createPortableTextComponents } from "@/components/portable-text/components"
import { JsonLd } from "@/components/seo/json-ld"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getPost, getPostSlugs } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { buildToc, readingTime, wordCount } from "@/lib/portable-text"
import { absoluteUrl, siteConfig } from "@/lib/site"
import { blogPostingSchema, breadcrumbSchema, jsonLdGraph } from "@/lib/structured-data"
import { urlFor } from "@/sanity/lib/image"

type Props = { params: Promise<{ slug: string }> }

/** Prerender every published post at build time; new posts render on demand. */
export async function generateStaticParams() {
  const slugs = await getPostSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post?.title) return { title: "Post not found" }

  const title = post.seo?.title || post.title
  const description =
    post.seo?.description ||
    post.excerpt ||
    `Read ${post.title}${post.author?.name ? ` by ${post.author.name}` : ""}.`

  return {
    title,
    description,
    alternates: { canonical: `/post/${slug}` },
    robots: post.seo?.noIndex ? { index: false } : undefined,
    openGraph: {
      title,
      description,
      type: "article",
      url: absoluteUrl(`/post/${slug}`),
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post._updatedAt,
      authors: post.author?.name ? [post.author.name] : undefined,
      tags: post.categories?.flatMap((c) => (c.title ? [c.title] : [])),
    },
  }
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  const title = post.title ?? "Untitled post"
  const { entries, idsByKey } = buildToc(post.body)
  const minutes = readingTime(post.body)
  const components = createPortableTextComponents(idsByKey)
  const hasToc = entries.length >= 2

  const structuredData = jsonLdGraph(
    blogPostingSchema({
      slug,
      title,
      description: post.seo?.description || post.excerpt,
      publishedAt: post.publishedAt,
      updatedAt: post._updatedAt,
      authorName: post.author?.name,
      tags: post.categories?.flatMap((c) => (c.title ? [c.title] : [])),
      wordCount: wordCount(post.body),
      image: post.mainImage?.asset ? urlFor(post.mainImage).width(1200).url() : undefined,
    }),
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Writing", path: "/post" },
      { name: title, path: `/post/${slug}` },
    ]),
  )

  return (
    <>
      <JsonLd data={structuredData} />
      <ReadingProgress targetId="post-body" />
      <article>
        <header className="relative overflow-hidden border-b">
          <GridBackdrop />
          <Container className="relative max-w-5xl py-10 sm:py-14">
            <Link
              href="/post"
              className="inline-flex items-center gap-1.5 label-caps transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" aria-hidden /> all posts
            </Link>
            {post.categories && post.categories.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-x-3 label-caps" aria-label="Categories">
                {post.categories.map((category) => (
                  <li key={category._id}>
                    <Link
                      href={`/post?category=${encodeURIComponent(category.title ?? "")}`}
                      className="transition-colors hover:text-foreground"
                    >
                      #{category.title?.toLowerCase()}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              {title}
            </h1>
            {post.excerpt && (
              <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{post.excerpt}</p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2 text-foreground">
                <Avatar className="size-7">
                  {post.author?.image?.asset && (
                    <AvatarImage
                      src={urlFor(post.author.image).width(64).height(64).url()}
                      alt=""
                    />
                  )}
                  <AvatarFallback className="text-xs">
                    {(post.author?.name ?? siteConfig.name).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {post.author?.name ?? siteConfig.name}
              </span>
              {post.publishedAt && (
                <time dateTime={post.publishedAt} className="label-caps">
                  {formatDate(post.publishedAt)}
                </time>
              )}
              <span className="label-caps">{minutes} min read</span>
            </div>
          </Container>
        </header>

        {post.mainImage?.asset && (
          <Container className="max-w-5xl pt-8">
            <Image
              src={urlFor(post.mainImage).width(1600).fit("max").auto("format").url()}
              alt={post.mainImage.alt || ""}
              width={post.cover?.width ?? 1600}
              height={post.cover?.height ?? 900}
              priority
              sizes="(min-width: 1024px) 1024px, 100vw"
              placeholder={post.cover?.lqip ? "blur" : "empty"}
              blurDataURL={post.cover?.lqip ?? undefined}
              className="h-auto w-full rounded-lg border"
            />
          </Container>
        )}

        <Container
          className={
            hasToc
              ? "grid max-w-5xl gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_13rem]"
              : "max-w-3xl py-10"
          }
        >
          <div id="post-body" className="min-w-0">
            {hasToc && (
              <details className="mb-8 rounded-lg border bg-surface p-4 lg:hidden">
                <summary className="cursor-pointer label-caps">on this page</summary>
                <ol className="mt-3 space-y-2 text-sm">
                  {entries.map((entry) => (
                    <li key={entry.id} className={entry.level === 3 ? "pl-4" : undefined}>
                      <a
                        href={`#${entry.id}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {entry.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
            )}
            <div className="prose prose-lg max-w-none">
              <PortableText value={post.body ?? []} components={components} />
            </div>
          </div>
          {hasToc && (
            <aside className="hidden lg:block">
              <TableOfContents entries={entries} className="sticky top-24" />
            </aside>
          )}
        </Container>

        <footer className="border-t">
          <Container className="max-w-5xl space-y-10 py-12">
            {(post.previous || post.next) && (
              <nav aria-label="More posts" className="grid gap-4 sm:grid-cols-2">
                {post.previous?.slug ? (
                  <Link
                    href={`/post/${post.previous.slug}`}
                    className="group rounded-lg border bg-surface p-4 transition-colors hover:border-border-strong"
                  >
                    <span className="flex items-center gap-1.5 label-caps">
                      <ArrowLeft className="size-3.5" aria-hidden /> older
                    </span>
                    <span className="mt-1 block font-medium group-hover:underline">
                      {post.previous.title}
                    </span>
                  </Link>
                ) : (
                  <span aria-hidden />
                )}
                {post.next?.slug && (
                  <Link
                    href={`/post/${post.next.slug}`}
                    className="group rounded-lg border bg-surface p-4 text-right transition-colors hover:border-border-strong"
                  >
                    <span className="flex items-center justify-end gap-1.5 label-caps">
                      newer <ArrowRight className="size-3.5" aria-hidden />
                    </span>
                    <span className="mt-1 block font-medium group-hover:underline">
                      {post.next.title}
                    </span>
                  </Link>
                )}
              </nav>
            )}

            {post.related.length > 0 && (
              <section aria-labelledby="related-heading">
                <Panel>
                  <PanelHeader title={<span id="related-heading">related entries</span>} />
                  <DataList>
                    {post.related.map((related) => (
                      <DataRow
                        key={related._id}
                        href={`/post/${related.slug}`}
                        title={related.title ?? "Untitled post"}
                        description={related.excerpt}
                        value={
                          related.publishedAt && (
                            <time
                              dateTime={related.publishedAt}
                              className="label-caps whitespace-nowrap"
                            >
                              {formatDate(related.publishedAt)}
                            </time>
                          )
                        }
                      />
                    ))}
                  </DataList>
                </Panel>
              </section>
            )}
          </Container>
        </footer>
      </article>
    </>
  )
}
