import { ImageResponse } from "next/og"
import { getProject, getProjectSlugs } from "@/lib/api"
import {
  OG_COLORS,
  OG_CONTENT_TYPE,
  OG_STATUS_COLORS,
  OG_SIZE,
  OgFrame,
  ogFonts,
  sanityOgImage,
} from "@/lib/og"
import { siteConfig } from "@/lib/site"
import { projectStatus } from "@/lib/status"

export const alt = `Project by ${siteConfig.name}`
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

/** Prerender a card for every page that's prerendered; new slugs render on demand. */
export async function generateStaticParams() {
  const slugs = await getProjectSlugs()
  return slugs.map((slug) => ({ slug }))
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = await getProject(slug)
  const fonts = await ogFonts()

  if (project?.seo?.ogImage?.asset) {
    return sanityOgImage(project.seo.ogImage, fonts)
  }

  if (!project?.title) {
    return new ImageResponse(
      <OgFrame
        eyebrow="project"
        title="Project not found"
        status={{ color: OG_COLORS.idle, label: "http 404" }}
      />,
      { ...size, fonts },
    )
  }

  const status = projectStatus(project)
  const gh = project.githubData
  const footer = [
    gh?.language,
    gh?.commits ? `${gh.commits} commits` : null,
    // Geist Mono has no ★ glyph (Satori would try to download a fallback font).
    gh?.stars ? `${gh.stars} ${gh.stars === 1 ? "star" : "stars"}` : null,
    gh?.license && gh.license !== "Not specified" ? gh.license : null,
  ].filter((item): item is string => Boolean(item))

  return new ImageResponse(
    <OgFrame
      eyebrow={status ? `project · ${status.label}` : "project"}
      title={project.title}
      description={project.description}
      footer={footer}
      status={status ? { color: OG_STATUS_COLORS[status.status], label: status.label } : undefined}
    />,
    { ...size, fonts },
  )
}
