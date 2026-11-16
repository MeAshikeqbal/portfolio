import type { Metadata } from "next"
import { HomecaveView } from "@/components/homecave/homecave-view"
import { getUses } from "@/lib/api"
import { toPublicStatus } from "@/lib/lab/public"
import { readLabStatus } from "@/lib/lab/store"
import { getTranslations } from "next-intl/server"
import { localizedPageMetadata } from "@/i18n/metadata"
import { siteConfig } from "@/lib/site"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("homecave")
  return localizedPageMetadata({
    title: t("title"),
    description: t("metaDescription", { name: siteConfig.name }),
    path: "/homecave",
  })
}

// Server-rendered from the latest heartbeat (so it works without JavaScript), at most 30s old;
// the page then keeps itself fresh in the browser.
export const revalidate = 30

export default async function HomecavePage() {
  const [uses, lab] = await Promise.all([
    getUses(),
    readLabStatus(process.env, fetch, { revalidate: 30 }),
  ])
  return <HomecaveView uses={uses} lab={lab ? toPublicStatus(lab) : null} />
}
