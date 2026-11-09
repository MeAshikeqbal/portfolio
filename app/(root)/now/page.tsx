import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { NowView } from "@/components/about/now-view"
import { getNow } from "@/lib/api"

export const metadata: Metadata = {
  title: "Now",
  description: "What Ashik Eqbal is focused on at the moment.",
  alternates: { canonical: "/now" },
}

// Re-render daily so the "stale" pill flips without waiting for a content edit.
export const revalidate = 86400

export default async function NowPage() {
  const now = await getNow()
  // Unpublished or empty: 404 rather than a blank page (it's also unlinked until then).
  if (!now?.body?.length) notFound()
  return <NowView now={now} />
}
