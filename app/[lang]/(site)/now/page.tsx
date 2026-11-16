import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { NowView } from "@/components/about/now-view"
import { LivePanel } from "@/components/live/live-panel"
import { getNow } from "@/lib/api"
import { getTranslations } from "next-intl/server"
import { defaultLocale } from "@/i18n/locales"
import { localizedPageMetadata } from "@/i18n/metadata"
import { siteConfig } from "@/lib/site"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta")
  return localizedPageMetadata({
    title: t("nowTitle"),
    description: t("nowDescription", { name: siteConfig.name }),
    path: "/now",
    // The update itself is English in every language: one canonical copy.
    available: [defaultLocale],
  })
}

// Re-render daily so the "stale" pill flips without waiting for a content edit.
export const revalidate = 86400

export default async function NowPage() {
  const now = await getNow()
  // Unpublished or empty: 404 rather than a blank page (it's also unlinked until then).
  if (!now?.body?.length) notFound()
  return <NowView now={now} live={<LivePanel />} />
}
