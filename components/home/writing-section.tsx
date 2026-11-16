import { Rss } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"
import { Container, Section } from "@/components/dashboard/layout"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { SectionHeader } from "@/components/dashboard/section-header"
import { getHomeStats, getLatestPosts } from "@/lib/api"
import { formatDate, trimText } from "@/lib/format"
import { Link } from "@/i18n/navigation"

/**
 * The lead section: writing is what most visitors come for. Pinned posts first (featured in
 * the Studio, and labelled so the dates don't look out of order), then the newest. The post
 * the hero already shows as "latest post" is skipped, so every slot is a new entry.
 */
export async function WritingSection() {
  const locale = await getLocale()
  const [candidates, stats, t] = await Promise.all([
    getLatestPosts(locale),
    getHomeStats(locale),
    getTranslations("writing"),
  ])
  const heroSlug = stats.latestPost?.slug
  const posts = candidates.filter((post) => post.slug !== heroSlug).slice(0, 3)
  if (posts.length === 0) return null

  return (
    <Section id="writing">
      <Container>
        <SectionHeader
          title={t("title")}
          description={t("description")}
          actions={[
            { href: "/post", label: t("allPosts", { count: stats.posts }) },
            { href: "/rss.xml", label: t("rss"), icon: <Rss aria-hidden /> },
          ]}
        />
        <Panel>
          <PanelHeader
            title={t("log")}
            meta={<span>{t("shown", { shown: posts.length, total: stats.posts })}</span>}
          />
          <ol className="divide-y">
            {posts.map((post) => {
              const excerpt = trimText(post.excerpt, 160)
              const tags = (post.categories ?? []).flatMap((c) =>
                c.title ? [`#${c.title.toLocaleLowerCase(locale)}`] : [],
              )
              return (
                <li key={post._id}>
                  <Link
                    href={`/post/${post.slug}`}
                    className="grid gap-x-8 gap-y-1.5 px-4 py-5 transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:-outline-offset-2 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:px-6 sm:py-6"
                  >
                    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1 label-caps sm:flex-col sm:pt-1.5">
                      {post.publishedAt && (
                        <time dateTime={post.publishedAt} className="tabular">
                          {formatDate(post.publishedAt, locale)}
                        </time>
                      )}
                      {post.pinned && <span className="text-foreground">{t("pinned")}</span>}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold tracking-tight text-pretty sm:text-xl">
                        {post.title ?? t("untitled")}
                      </h3>
                      {excerpt && (
                        <p className="mt-1.5 max-w-prose text-pretty text-muted-foreground">
                          {excerpt}
                        </p>
                      )}
                      {tags.length > 0 && (
                        <p className="mt-2.5 flex flex-wrap gap-x-3 label-caps">
                          {tags.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ol>
        </Panel>
      </Container>
    </Section>
  )
}
