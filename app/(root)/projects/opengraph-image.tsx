import { ImageResponse } from "next/og"
import { getProjects } from "@/lib/api"
import { formatCompact } from "@/lib/format"
import { OG_CONTENT_TYPE, OG_SIZE, OG_STATUS_COLORS, OgFrame, ogFonts } from "@/lib/og"
import { siteConfig } from "@/lib/site"
import { projectStatus } from "@/lib/status"

export const alt = `Projects by ${siteConfig.name}`
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

/** The services index: how many, what state they're in, and how much work went in. */
export default async function Image() {
  const projects = await getProjects()
  const now = new Date()

  // Counted per visible label ("active", "maintained", "dormant", "archived"), most first.
  const counts = new Map<string, number>()
  for (const project of projects) {
    const status = projectStatus(project, now)
    if (status) counts.set(status.label, (counts.get(status.label) ?? 0) + 1)
  }
  const active = counts.get("active") ?? 0
  // "active" goes in the status bar with its green dot; the footer lists the rest.
  const states = [...counts]
    .filter(([label]) => label !== "active")
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, n]) => `${n} ${label}`)

  const commits = projects.reduce((sum, p) => sum + (p.githubData?.commits ?? 0), 0)

  return new ImageResponse(
    <OgFrame
      eyebrow={`projects · ${projects.length} ${projects.length === 1 ? "service" : "services"}`}
      title="Projects"
      description="Everything I've built and run, with stats from GitHub."
      footer={[
        ...states.slice(0, 3),
        ...(commits > 0 ? [`${formatCompact(commits)} commits, 12 mo`] : []),
      ]}
      // Green only for activity that's declared and measured; nothing is claimed otherwise.
      status={active > 0 ? { color: OG_STATUS_COLORS.up, label: `${active} active` } : undefined}
    />,
    { ...size, fonts: await ogFonts() },
  )
}
