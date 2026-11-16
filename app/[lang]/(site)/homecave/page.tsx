import type { Metadata } from "next"
import { HomecaveView } from "@/components/homecave/homecave-view"
import { getHomecaveRecord, getUses } from "@/lib/api"
import { toPublicReliability } from "@/lib/lab/incidents"
import { toPublicStatus } from "@/lib/lab/public"
import { readLabReliability, readLabStatus } from "@/lib/lab/store"
import { getTranslations } from "next-intl/server"
import { currentLocale, localizedPageMetadata } from "@/i18n/metadata"
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
  const locale = await currentLocale()
  const [uses, history, lab, record] = await Promise.all([
    getUses(locale),
    getHomecaveRecord(locale),
    readLabStatus(process.env, fetch, { revalidate: 30 }),
    // The track record moves slowly: one Upstash read a minute at most, shared by every language.
    readLabReliability(process.env, fetch, { revalidate: 60 }),
  ])
  return (
    <HomecaveView
      uses={uses}
      lab={lab ? toPublicStatus(lab) : null}
      record={record ? toPublicReliability(record) : null}
      history={history}
    />
  )
}
