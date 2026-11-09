import { ImageResponse } from "next/og"
import { getProject, getProjectSlugs } from "@/lib/api"
import { OG_COLORS, OG_CONTENT_TYPE, OG_SIZE, OgFrame, ogFonts } from "@/lib/og"
import { siteConfig } from "@/lib/site"
import { projectStatus } from "@/lib/status"
import { urlFor } from "@/sanity/lib/image"

export const alt = `Project by ${siteConfig.name}`
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

/** Prerender a card for every page that's prerendered; new slugs render on demand. */
export async function generateStaticParams() {
  const slugs = await getProjectSlugs()
  return slugs.map((slug) => ({ slug }))
}

const STATUS_COLORS = { up: OG_COLORS.up, info: OG_COLORS.info, idle: OG_COLORS.idle } as const

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = await getProject(slug)
  const fonts = await ogFonts()

  if (project?.seo?.ogImage?.asset) {
    return new ImageResponse(
      <img
        src={urlFor(project.seo.ogImage).width(size.width).height(size.height).url()}
        width={size.width}
        height={size.height}
        alt=""
      />,
      { ...size, fonts },
    )
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
      status={
        status && status.status in STATUS_COLORS
          ? {
              color: STATUS_COLORS[status.status as keyof typeof STATUS_COLORS],
              label: status.label,
            }
          : undefined
      }
    />,
    { ...size, fonts },
  )
}
