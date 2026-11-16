import type { Metadata } from "next"
import { Suspense } from "react"
import { PostsBrowser, PostsBrowserView } from "@/components/blog/posts-browser"
import { Container, Section } from "@/components/dashboard/layout"
import { SectionHeader } from "@/components/dashboard/section-header"
import { getPosts } from "@/lib/api"
import { getTranslations } from "next-intl/server"
import { localizedPageMetadata } from "@/i18n/metadata"
import { siteConfig } from "@/lib/site"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta")
  return localizedPageMetadata({
    title: t("writingTitle"),
    description: t("writingDescription", { name: siteConfig.name }),
    path: "/post",
  })
}

export default async function PostsPage() {
  const [posts, t] = await Promise.all([getPosts(), getTranslations("writing")])

  return (
    <main>
      <Section className="pt-12 sm:pt-16">
        <Container>
          <SectionHeader as="h1" title={t("title")} description={t("description")} />
          {/* Filters read the URL; the prerendered fallback is the same list, unfiltered. */}
          <Suspense fallback={<PostsBrowserView posts={posts} />}>
            <PostsBrowser posts={posts} />
          </Suspense>
        </Container>
      </Section>
    </main>
  )
}
