"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo } from "react"
import { ChipFilter } from "@/components/dashboard/chip-filter"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { MorphTitle } from "@/components/motion/morph-title"
import { SearchInput } from "@/components/dashboard/search-input"
import { useUrlParam } from "@/hooks/use-url-param"
import type { PostCard } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { urlFor } from "@/sanity/lib/image"

/** Searchable post list with category filters; both live in the URL (?q=, ?category=). */
export function PostsBrowser({ posts }: { posts: PostCard[] }) {
  const [query, setQuery] = useUrlParam("q")
  const [category, setCategory] = useUrlParam("category")
  return (
    <PostsBrowserView
      posts={posts}
      query={query}
      category={category}
      onQueryChange={setQuery}
      onCategoryChange={setCategory}
    />
  )
}

const noop = () => {}

/**
 * The browser's markup without URL hooks. The page prerenders it (unfiltered) as the Suspense
 * fallback, so the static HTML already has the full list and nothing shifts when filters load.
 */
export function PostsBrowserView({
  posts,
  query = "",
  category = "",
  onQueryChange = noop,
  onCategoryChange = noop,
}: {
  posts: PostCard[]
  query?: string
  category?: string
  onQueryChange?: (value: string) => void
  onCategoryChange?: (value: string) => void
}) {
  const setQuery = onQueryChange
  const setCategory = onCategoryChange

  const categories = useMemo(
    () =>
      [
        ...new Set(
          posts.flatMap((p) => (p.categories ?? []).map((c) => c.title ?? "").filter(Boolean)),
        ),
      ].sort(),
    [posts],
  )

  const needle = query.trim().toLowerCase()
  const visible = posts.filter((post) => {
    const text = `${post.title ?? ""} ${post.excerpt ?? ""}`.toLowerCase()
    if (needle && !text.includes(needle)) return false
    if (category && !(post.categories ?? []).some((c) => c.title === category)) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput label="Search posts" value={query} onChange={setQuery} />
        <p className="label-caps" aria-live="polite">
          {visible.length} of {posts.length} entries
        </p>
      </div>
      {categories.length > 1 && (
        <ChipFilter label="topic" options={categories} value={category} onChange={setCategory} />
      )}

      <Panel>
        <PanelHeader title="log" meta={<span>newest first</span>} />
        {visible.length > 0 ? (
          <ul className="divide-y">
            {visible.map((post) => (
              <li key={post._id}>
                <PostRow post={post} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-10 text-center text-muted-foreground">No posts match these filters.</p>
        )}
      </Panel>
    </div>
  )
}

function PostRow({ post }: { post: PostCard }) {
  return (
    <Link
      href={`/post/${post.slug}`}
      className="group flex gap-4 p-4 transition-colors hover:bg-surface-2 focus-visible:bg-surface-2"
    >
      {post.mainImage?.asset && (
        <Image
          src={urlFor(post.mainImage).width(320).height(200).url()}
          alt=""
          width={160}
          height={100}
          sizes="160px"
          placeholder={post.lqip ? "blur" : "empty"}
          blurDataURL={post.lqip ?? undefined}
          className="hidden aspect-[8/5] w-40 shrink-0 rounded-md border object-cover sm:block"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-x-3 label-caps">
          {post.publishedAt && (
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          )}
          {(post.categories ?? []).map((c) => (
            <span key={c._id}>#{c.title?.toLowerCase()}</span>
          ))}
        </div>
        <MorphTitle kind="post" id={post.slug}>
          <h2 className="mt-1 font-medium text-balance group-hover:underline">{post.title}</h2>
        </MorphTitle>
        {post.excerpt && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
        )}
      </div>
    </Link>
  )
}
