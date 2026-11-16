import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { NowView } from "@/components/about/now-view"
import { LivePanel } from "@/components/live/live-panel"
import { getNow } from "@/lib/api"
import { getTranslations } from "next-intl/server"
import { currentLocale, localizedPageMetadata } from "@/i18n/metadata"
import { servedLanguages } from "@/lib/metadata"
import { siteConfig } from "@/lib/site"

export async function generateMetadata(): Promise<Metadata> {
  const [t, now] = await Promise.all([getTranslations("meta"), getNow(await currentLocale())])
  return localizedPageMetadata({
    title: t("nowTitle"),
    description: t("nowDescription", { name: siteConfig.name }),
    path: "/now",
    // Only the languages it's translated into; elsewhere the English copy is canonical.
    available: servedLanguages(now?.languages),
  })
}

// Re-render daily so the "stale" pill flips without waiting for a content edit.
export const revalidate = 86400

export default async function NowPage() {
  const now = await getNow(await currentLocale())
  // Unpublished or empty: 404 rather than a blank page (it's also unlinked until then).
  if (!now?.body?.length) notFound()
  return <NowView now={now} live={<LivePanel />} />
}
