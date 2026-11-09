import { DataList, DataRow } from "@/components/dashboard/data-list"
import { Container, Section } from "@/components/dashboard/layout"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { SectionHeader } from "@/components/dashboard/section-header"
import { getLatestPosts } from "@/lib/api"
import { formatDate } from "@/lib/format"

export async function WritingSection() {
  const posts = await getLatestPosts()
  if (posts.length === 0) return null

  return (
    <Section id="writing" className="border-t">
      <Container>
        <SectionHeader
          eyebrow="incident log"
          title="Writing"
          description="Notes on building, breaking and fixing things."
          action={{ href: "/post", label: "all posts" }}
        />
        <Panel>
          <PanelHeader title="latest entries" meta={<span>published</span>} />
          <DataList>
            {posts.map((post) => (
              <DataRow
                key={post._id}
                href={`/post/${post.slug}`}
                title={post.title ?? "Untitled post"}
                description={post.excerpt}
                meta={(post.categories ?? []).flatMap((c) =>
                  c.title ? [`#${c.title.toLowerCase()}`] : [],
                )}
                value={
                  post.publishedAt && (
                    <time dateTime={post.publishedAt} className="label-caps whitespace-nowrap">
                      {formatDate(post.publishedAt)}
                    </time>
                  )
                }
              />
            ))}
          </DataList>
        </Panel>
      </Container>
    </Section>
  )
}
