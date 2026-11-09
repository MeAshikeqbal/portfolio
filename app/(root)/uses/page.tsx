import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { UsesView, visibleUsesSections } from "@/components/about/uses-view"
import { getUses } from "@/lib/api"

export const metadata: Metadata = {
  title: "Uses",
  description: "The hardware, software and services Ashik Eqbal uses.",
  alternates: { canonical: "/uses" },
}

export default async function UsesPage() {
  const uses = await getUses()
  // Unpublished or empty: 404 rather than a half-empty page (it's also unlinked until then).
  if (!uses || visibleUsesSections(uses).length === 0) notFound()
  return <UsesView uses={uses} />
}
