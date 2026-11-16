import { PortableText } from "@portabletext/react"
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { FaGithub } from "react-icons/fa6"
import { ReadingProgress } from "@/components/blog/reading-progress"
import { TableOfContents } from "@/components/blog/table-of-contents"
import { DataList, DataRow } from "@/components/dashboard/data-list"
import { Container, GridBackdrop } from "@/components/dashboard/layout"
import { MetricGrid, MetricTile } from "@/components/dashboard/metric-tile"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { Sparkline } from "@/components/dashboard/sparkline"
import { StatusPill } from "@/components/dashboard/status-pill"
import { VideoFigure } from "@/components/media/video-figure"
import { createPortableTextComponents } from "@/components/portable-text/components"
import { LiveSiteShot } from "@/components/projects/live-site-shot"
import { ProjectReadme } from "@/components/projects/project-readme"
import { JsonLd } from "@/components/seo/json-ld"
import { Button } from "@/components/ui/button"
import { getProject, getProjectSlugs, getProjects } from "@/lib/api"
import { parseRepoUrl } from "@/lib/fetch-github-data"
import { formatMonth } from "@/lib/format"
import { pageMetadata } from "@/lib/metadata"
import { buildToc, type TocEntry } from "@/lib/portable-text"
import { adjacentProjects, hasActivity, relatedProjects } from "@/lib/projects"
import { isBoilerplateReadme } from "@/lib/readme"
import { screenshotUrl } from "@/lib/screenshot"
import { projectStatus } from "@/lib/status"
import { breadcrumbSchema, jsonLdGraph, projectSchema } from "@/lib/structured-data"
import { playableKind } from "@/lib/video"
import { urlFor } from "@/sanity/lib/image"

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const slugs = await getProjectSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const project = await getProject(slug)
  if (!project?.title) return { title: "Project not found" }

  const title = project.seo?.title || project.title
  const description =
    project.seo?.description || project.description || `${project.title}, a project by Ashik Eqbal.`

  return {
    ...pageMetadata({
      title,
      description,
      path: `/projects/${slug}`,
      openGraph: { type: "article" },
    }),
    robots: project.seo?.noIndex ? { index: false } : undefined,
  }
}

/** Laid out like a post (app/(root)/post/[slug]/page.tsx): header, media, body + contents, footer. */
export default async function ProjectPage({ params }: Props) {
  const { slug } = await params
  const [project, projects] = await Promise.all([getProject(slug), getProjects()])
  if (!project) notFound()

  const title = project.title ?? "Untitled project"
  const status = projectStatus(project)
  const gh = project.githubData
  const weekly = gh?.weeklyCommits ?? []
  const tags = project.tech ?? []

  // The demo video, when set, takes the cover's place; with neither, the live site's screenshot.
  const hasVideo = playableKind(project.video) !== null
  const liveShot =
    !hasVideo && !project.mainImage?.asset && project.url
      ? screenshotUrl(project.url, 1024, 640)
      : null

  const hasBody = Boolean(project.body && project.body.length > 0)
  const { entries: bodyEntries, idsByKey } = buildToc(project.body)
  const components = createPortableTextComponents(idsByKey)

  const repo = project.github ? parseRepoUrl(project.github) : null
  const readme =
    repo && project.readme?.markdown && !isBoilerplateReadme(project.readme.markdown)
      ? {
          markdown: project.readme.markdown,
          source: {
            ...repo,
            ref: project.readme.ref || "HEAD",
            path: project.readme.path || "README.md",
          },
        }
      : null

  // The README panel's own heading (id="readme") joins the case study's headings.
  const entries: TocEntry[] = [
    ...bodyEntries,
    ...(readme ? [{ id: "readme", text: "README", level: 2 as const }] : []),
  ]
  const hasToc = entries.length >= 2

  const { previous, next } = adjacentProjects(slug, projects)
  const related = relatedProjects(project, projects)

  const structuredData = jsonLdGraph(
    projectSchema({
      slug,
      title,
      description: project.seo?.description || project.description,
      repo: project.github,
      url: project.url,
      language: gh?.language,
      license: gh?.license,
      image: project.mainImage?.asset ? urlFor(project.mainImage).width(1200).url() : undefined,
    }),
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Projects", path: "/projects" },
      { name: title, path: `/projects/${slug}` },
    ]),
  )

  return (
    <>
      <JsonLd data={structuredData} />
      <ReadingProgress targetId="project-body" />
      <main>
        <article>
          <header className="relative overflow-hidden border-b">
            <GridBackdrop />
            <Container className="relative max-w-5xl py-6 sm:py-14">
              <Link
                href="/projects"
                className="inline-flex items-center gap-1.5 label-caps transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" aria-hidden /> all projects
              </Link>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 sm:mt-6">
                {status && <StatusPill status={status.status}>{status.label}</StatusPill>}
                {tags.length > 0 && (
                  <ul className="flex flex-wrap gap-x-3 label-caps" aria-label="Tech stack">
                    {tags.map((tag) => (
                      <li key={tag}>
                        <Link
                          href={`/projects?tag=${encodeURIComponent(tag)}`}
                          className="transition-colors hover:text-foreground"
                        >
                          #{tag.toLowerCase()}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* Same scale as a post title: 1.875rem on phones, 3rem from sm. */}
              <h1 className="mt-2 max-w-3xl text-3xl leading-tight font-semibold tracking-tight text-balance sm:mt-3 sm:text-5xl">
                {title}
              </h1>
              {project.description && (
                <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                  {project.description}
                </p>
              )}
              {(project.url || project.github) && (
                <div className="mt-6 flex flex-wrap gap-3">
                  {project.url && (
                    <Button asChild>
                      <a href={project.url} target="_blank" rel="noopener noreferrer">
                        Visit live site <ArrowUpRight />
                      </a>
                    </Button>
                  )}
                  {project.github && (
                    <Button asChild variant="outline">
                      <a href={project.github} target="_blank" rel="noopener noreferrer">
                        <FaGithub /> Source on GitHub
                      </a>
                    </Button>
                  )}
                </div>
              )}
              {gh && (
                <MetricGrid className="mt-8 sm:mt-10">
                  <MetricTile
                    label="commits"
                    value={gh.commits ?? "—"}
                    hint="past year"
                    trend={
                      hasActivity(weekly) ? (
                        <Sparkline values={weekly} label={`${title} commits per week`} />
                      ) : undefined
                    }
                  />
                  <MetricTile label="stars" value={gh.stars ?? 0} />
                  <MetricTile
                    label="language"
                    value={<span className="text-xl">{gh.language ?? "—"}</span>}
                  />
                  <MetricTile
                    label="last push"
                    value={<span className="text-xl">{formatMonth(gh.pushedAt) ?? "—"}</span>}
                    hint={gh.license && gh.license !== "Not specified" ? gh.license : undefined}
                  />
                </MetricGrid>
              )}
            </Container>
          </header>

          {(hasVideo || project.mainImage?.asset || liveShot) && (
            <Container className="max-w-5xl pt-4 sm:pt-8">
              {hasVideo ? (
                <VideoFigure value={project.video} />
              ) : project.mainImage?.asset ? (
                <Image
                  src={urlFor(project.mainImage).width(1600).height(900).url()}
                  alt={project.mainImage.alt || title}
                  width={1600}
                  height={900}
                  priority
                  // Tinted until the image arrives (no blur placeholder for project covers).
                  className="h-auto w-full rounded-lg border bg-surface-2"
                  sizes="(min-width: 1024px) 1024px, 100vw"
                />
              ) : (
                // No cover set: show the live site itself (thum.io, cached by next/image).
                liveShot &&
                project.url && <LiveSiteShot src={liveShot} host={hostOf(project.url)} />
              )}
            </Container>
          )}

          <Container
            className={
              hasToc
                ? "grid max-w-5xl gap-10 py-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_13rem]"
                : "max-w-3xl py-6 sm:py-10"
            }
          >
            <div id="project-body" className="min-w-0">
              {hasToc && (
                <details className="mb-6 rounded-lg border bg-surface p-4 sm:mb-8 lg:hidden">
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

              {hasBody ? (
                <div className="prose prose-lg max-w-none">
                  <PortableText value={project.body!} components={components} />
                </div>
              ) : (
                !readme && (
                  <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                    No write-up yet.
                  </p>
                )
              )}

              {readme && (
                <ProjectReadme
                  {...readme}
                  open={!hasBody}
                  className={hasBody ? "mt-12" : undefined}
                />
              )}
            </div>
            {hasToc && (
              <aside className="hidden lg:block">
                <TableOfContents entries={entries} className="sticky top-24" />
              </aside>
            )}
          </Container>

          {(previous || next || related.length > 0) && (
            <footer className="border-t">
              <Container className="max-w-5xl space-y-10 py-12">
                {(previous || next) && (
                  <nav aria-label="More projects" className="grid gap-4 sm:grid-cols-2">
                    {previous?.slug ? (
                      <Link
                        href={`/projects/${previous.slug}`}
                        className="group rounded-lg border bg-surface p-4 transition-colors hover:border-border-strong"
                      >
                        <span className="flex items-center gap-1.5 label-caps">
                          <ArrowLeft className="size-3.5" aria-hidden /> previous
                        </span>
                        <span className="mt-1 block font-medium group-hover:underline">
                          {previous.title}
                        </span>
                      </Link>
                    ) : (
                      <span aria-hidden />
                    )}
                    {next?.slug && (
                      <Link
                        href={`/projects/${next.slug}`}
                        className="group rounded-lg border bg-surface p-4 text-right transition-colors hover:border-border-strong"
                      >
                        <span className="flex items-center justify-end gap-1.5 label-caps">
                          next <ArrowRight className="size-3.5" aria-hidden />
                        </span>
                        <span className="mt-1 block font-medium group-hover:underline">
                          {next.title}
                        </span>
                      </Link>
                    )}
                  </nav>
                )}

                {related.length > 0 && (
                  <section aria-labelledby="related-heading">
                    <Panel>
                      <PanelHeader title={<span id="related-heading">related projects</span>} />
                      <DataList>
                        {related.map((item) => (
                          <DataRow
                            key={item._id}
                            href={`/projects/${item.slug}`}
                            title={item.title ?? "Untitled project"}
                            status={projectStatus(item) ?? undefined}
                            description={item.description}
                            meta={item.tech?.slice(0, 3)}
                          />
                        ))}
                      </DataList>
                    </Panel>
                  </section>
                )}
              </Container>
            </footer>
          )}
        </article>
      </main>
    </>
  )
}

/** "www.example.com" from a URL, or the URL itself if it doesn't parse. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}
