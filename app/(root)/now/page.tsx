import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { NowView } from "@/components/about/now-view"
import { LivePanel } from "@/components/live/live-panel"
import { getNow } from "@/lib/api"
import { pageMetadata } from "@/lib/metadata"

export const metadata: Metadata = pageMetadata({
  title: "Now",
  description: "What Ashik Eqbal is focused on at the moment.",
  path: "/now",
})

// Re-render daily so the "stale" pill flips without waiting for a content edit.
export const revalidate = 86400

export default async function NowPage() {
  const now = await getNow()
  // Unpublished or empty: 404 rather than a blank page (it's also unlinked until then).
  if (!now?.body?.length) notFound()
  return <NowView now={now} live={<LivePanel />} />
}
