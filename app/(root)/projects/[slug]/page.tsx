import { PortableText } from "@portabletext/react"
import { ArrowLeft, ArrowUpRight } from "lucide-react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { FaGithub } from "react-icons/fa6"
import { Container, Section } from "@/components/dashboard/layout"
import { MetricGrid, MetricTile } from "@/components/dashboard/metric-tile"
import { Sparkline } from "@/components/dashboard/sparkline"
import { StatusPill } from "@/components/dashboard/status-pill"
import { Button } from "@/components/ui/button"
import { getProject, getProjectSlugs } from "@/lib/api"
import { formatMonth } from "@/lib/format"
import { absoluteUrl } from "@/lib/site"
import { projectStatus } from "@/lib/status"
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
  const imageSource = project.seo?.ogImage?.asset
    ? project.seo.ogImage
    : project.mainImage?.asset
      ? project.mainImage
      : null

  return {
    title,
    description,
    alternates: { canonical: `/projects/${slug}` },
    robots: project.seo?.noIndex ? { index: false } : undefined,
    openGraph: {
      title,
      description,
      type: "article",
      url: absoluteUrl(`/projects/${slug}`),
      images: imageSource
        ? [{ url: urlFor(imageSource).width(1200).height(630).url(), width: 1200, height: 630 }]
        : [],
    },
  }
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params
  const project = await getProject(slug)
  if (!project) notFound()

  const status = projectStatus(project.status)
  const gh = project.githubData
  const weekly = gh?.weeklyCommits ?? []
  const title = project.title ?? "Untitled project"

  return (
    <main>
      <Section className="pt-10 sm:pt-14">
        <Container className="max-w-4xl">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 label-caps transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden /> all projects
          </Link>

          <header className="mt-6">
            {status && <StatusPill status={status.status}>{status.label}</StatusPill>}
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              {title}
            </h1>
            {project.description && (
              <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{project.description}</p>
            )}
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
          </header>

          {gh && (
            <MetricGrid className="mt-10">
              <MetricTile
                label="commits"
                value={gh.commits ?? "—"}
                hint={weekly.length > 1 ? `last ${weekly.length} weeks` : "past year"}
                trend={
                  weekly.length > 1 ? (
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

          {project.tech && project.tech.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Tech stack">
              {project.tech.map((tech) => (
                <li
                  key={tech}
                  className="rounded-full border px-2.5 py-1 font-mono text-xs text-muted-foreground"
                >
                  {tech}
                </li>
              ))}
            </ul>
          )}

          {project.mainImage?.asset && (
            <Image
              src={urlFor(project.mainImage).width(1600).height(900).url()}
              alt={project.mainImage.alt || title}
              width={1600}
              height={900}
              className="mt-10 rounded-lg border"
              sizes="(min-width: 896px) 896px, 100vw"
            />
          )}

          <div className="mt-12">
            {project.body && project.body.length > 0 ? (
              <article className="prose max-w-none">
                <PortableText value={project.body} />
              </article>
            ) : (
              <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                No write-up yet.{" "}
                {project.github && (
                  <a
                    href={project.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4 hover:text-foreground"
                  >
                    Read the README on GitHub
                  </a>
                )}
              </p>
            )}
          </div>
        </Container>
      </Section>
    </main>
  )
}
