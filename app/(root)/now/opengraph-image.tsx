import { ImageResponse } from "next/og"
import { getNow } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { OG_CONTENT_TYPE, OG_SIZE, OG_STATUS_COLORS, OgFrame, ogFonts } from "@/lib/og"
import { blockText } from "@/lib/portable-text"
import { siteConfig } from "@/lib/site"
import { isStale } from "@/lib/staleness"

export const alt = `What ${siteConfig.name} is doing now`
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

// Daily, like the page, so the "stale" dot flips without waiting for a content edit.
export const revalidate = 86400

/** The current /now update: when and where it was written, and its opening line. */
export default async function Image() {
  const now = await getNow()
  const fonts = await ogFonts()

  if (!now?.body?.length) {
    return new ImageResponse(
      <OgFrame
        eyebrow="now"
        title="Now"
        status={{ color: OG_STATUS_COLORS.idle, label: "not published" }}
      />,
      { ...size, fonts },
    )
  }

  const updated = formatDate(now.updated)
  const opening = now.body
    .filter((block) => block._type === "block")
    .map((block) => blockText(block).trim())
    .find(Boolean)
  const stale = isStale(now.updated, new Date(), siteConfig.nowStaleAfterDays)

  return new ImageResponse(
    <OgFrame
      eyebrow={["now", updated && `updated ${updated}`, now.location].filter(Boolean).join(" · ")}
      title="What I'm doing now"
      description={opening}
      // Amber only when measurably out of date; a fresh update claims nothing.
      status={stale ? { color: OG_STATUS_COLORS.warn, label: "stale" } : undefined}
    />,
    { ...size, fonts },
  )
}
