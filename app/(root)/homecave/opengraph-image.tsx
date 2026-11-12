import { ImageResponse } from "next/og"
import { toPublicStatus } from "@/lib/lab/public"
import { labShareFacts } from "@/lib/lab/share"
import { readLabStatus } from "@/lib/lab/store"
import { HOMECAVE_DESCRIPTION } from "@/lib/metadata"
import { OG_CONTENT_TYPE, OG_SIZE, OG_STATUS_COLORS, OgFrame, ogFonts } from "@/lib/og"
import { siteConfig } from "@/lib/site"

export const alt = `${siteConfig.name}'s homelab, live`
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

// Whoever unfurls a link caches its card, so the card carries its own "measured" time;
// five minutes is fresh enough for a share and cheap on Upstash.
export const revalidate = 300

/** The lab at a glance, from the anonymized public status: counts and states only. */
export default async function Image() {
  const raw = await readLabStatus(process.env, fetch, { revalidate })
  const { status, footer } = labShareFacts(raw ? toPublicStatus(raw) : null, new Date())

  return new ImageResponse(
    <OgFrame
      // "live" only when there is something live to show.
      eyebrow={footer.length > 0 ? "homelab · live" : "homelab"}
      title="Homecave"
      description={HOMECAVE_DESCRIPTION}
      footer={footer}
      status={{ color: OG_STATUS_COLORS[status.status], label: status.label }}
    />,
    { ...size, fonts: await ogFonts() },
  )
}
