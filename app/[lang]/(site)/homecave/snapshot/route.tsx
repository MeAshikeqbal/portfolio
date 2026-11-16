import { ImageResponse } from "next/og"
import { homelabSpecs } from "@/components/about/uses-view"
import { SNAPSHOT_WIDTH, SnapshotCard, snapshotHeight } from "@/components/homecave/snapshot-card"
import { defaultLocale, isLocale } from "@/i18n/locales"
import { routeTranslations } from "@/i18n/route-translations"
import { getUses } from "@/lib/api"
import { toPublicStatus } from "@/lib/lab/public"
import { labSnapshot, snapshotFilename, snapshotLabels, snapshotTime } from "@/lib/lab/snapshot"
import { readLabStatus } from "@/lib/lab/store"
import { ogFonts } from "@/lib/og"

export const dynamic = "force-dynamic"

/**
 * A PNG of the homelab right now, for Homecave's "Snapshot" button: the same anonymized public
 * status the page shows, drawn as one picture in the page's language. `?download=1` saves it as
 * a dated file; without it the image is served inline, so the link can be shared. CDN-cached for
 * 30 seconds, like /api/lab-status (the agents report every 30).
 */
export async function GET(request: Request, { params }: RouteContext<"/[lang]/homecave/snapshot">) {
  const { lang } = await params
  const locale = isLocale(lang) ? lang : defaultLocale
  const download = new URL(request.url).searchParams.has("download")
  const [uses, lab, t] = await Promise.all([
    getUses(),
    readLabStatus(process.env, fetch, { revalidate: 30 }),
    routeTranslations(locale, "homecave"),
  ])
  const now = new Date()
  const snapshot = labSnapshot(lab ? toPublicStatus(lab) : null, now, homelabSpecs(uses), t, locale)

  const labels = snapshotLabels(t, snapshotTime(now, locale))
  return new ImageResponse(<SnapshotCard snapshot={snapshot} labels={labels} />, {
    width: SNAPSHOT_WIDTH,
    height: snapshotHeight(snapshot),
    fonts: await ogFonts(locale, snapshot, labels),
    headers: {
      // ImageResponse defaults to a year-long immutable cache; this picture is live.
      "cache-control": "public, s-maxage=30, stale-while-revalidate=30",
      "content-disposition": `${download ? "attachment" : "inline"}; filename="${snapshotFilename(now)}"`,
    },
  })
}
