import type { Metadata } from "next"
import { Suspense } from "react"
import { PostsBrowser } from "@/components/blog/posts-browser"
import { Container, Section } from "@/components/dashboard/layout"
import { SectionHeader } from "@/components/dashboard/section-header"
import { getPosts } from "@/lib/api"

export const metadata: Metadata = {
  title: "Writing",
  description: "Notes on building, breaking and fixing things, by Ashik Eqbal.",
  alternates: { canonical: "/post" },
}

export default async function PostsPage() {
  const posts = await getPosts()

  return (
    <main>
      <Section className="pt-12 sm:pt-16">
        <Container className="max-w-4xl">
          <SectionHeader
            as="h1"
            eyebrow="incident log"
            title="Writing"
            description="Notes on building, breaking and fixing things."
          />
          {/* Filters read the URL; without JS (or while loading) the full list renders. */}
          <Suspense fallback={<PostsBrowserFallback count={posts.length} />}>
            <PostsBrowser posts={posts} />
          </Suspense>
        </Container>
      </Section>
    </main>
  )
}

function PostsBrowserFallback({ count }: { count: number }) {
  return <p className="label-caps">{count} entries</p>
}
