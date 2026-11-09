import { ImageResponse } from "next/og"
import { getHomeStats } from "@/lib/api"
import { formatCompact } from "@/lib/format"
import { OG_CONTENT_TYPE, OG_SIZE, OgFrame, ogFonts } from "@/lib/og"
import { siteConfig } from "@/lib/site"

export const alt = `${siteConfig.name} — ${siteConfig.role}`
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

/** Default share card for every page without its own (home, /post, /projects…). */
export default async function Image() {
  const stats = await getHomeStats()
  return new ImageResponse(
    <OgFrame
      eyebrow={siteConfig.role}
      title={siteConfig.name}
      description={siteConfig.tagline}
      footer={[
        `${stats.posts} posts`,
        `${stats.projects} projects`,
        ...(stats.commits > 0 ? [`${formatCompact(stats.commits)} commits, 12 mo`] : []),
      ]}
    />,
    { ...size, fonts: await ogFonts() },
  )
}
