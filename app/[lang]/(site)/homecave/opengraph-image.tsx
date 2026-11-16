import { ImageResponse } from "next/og"
import { toPublicStatus } from "@/lib/lab/public"
import { labShareFacts } from "@/lib/lab/share"
import { readLabStatus } from "@/lib/lab/store"
import { OG_CONTENT_TYPE, OG_SIZE, OG_STATUS_COLORS, OgFrame, ogFonts } from "@/lib/og"
import { siteConfig } from "@/lib/site"
import { routeTranslations } from "@/i18n/route-translations"
import { ogLocale, ogStaticParams, type OgParams } from "@/i18n/og"

export const alt = `${siteConfig.name}'s homelab, live`
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const generateStaticParams = ogStaticParams

// Whoever unfurls a link caches its card, so the card carries its own "measured" time;
// five minutes is fresh enough for a share and cheap on Upstash.
export const revalidate = 300

/** The lab at a glance, from the anonymized public status: counts and states only. */
export default async function Image({ params }: { params: OgParams }) {
  const locale = await ogLocale(params)
  const [raw, t, homecave] = await Promise.all([
    readLabStatus(process.env, fetch, { revalidate }),
    routeTranslations(locale, "og"),
    routeTranslations(locale, "homecave"),
  ])
  const facts = labShareFacts(raw ? toPublicStatus(raw) : null, new Date(), locale)
  const status = {
    status: facts.status,
    label:
      facts.up === null
        ? homecave("noData")
        : homecave("labSummary", { up: facts.up, total: facts.total }),
  }
  const footer = facts.footer.map((fact) => {
    switch (fact.kind) {
      case "uptime":
        return t("uptime", { uptime: fact.uptime })
      case "guests":
        return t("guests", { running: fact.running, total: fact.total })
      case "pools":
        return t("pools", { healthy: fact.healthy, total: fact.total })
      case "measured":
        return t("measured", { time: fact.time })
    }
  })

  return new ImageResponse(
    <OgFrame
      // "live" only when there is something live to show.
      eyebrow={footer.length > 0 ? t("homelabLive") : t("homelab")}
      title={homecave("title")}
      description={homecave("metaDescription", { name: siteConfig.name })}
      footer={footer}
      status={{ color: OG_STATUS_COLORS[status.status], label: status.label }}
    />,
    { ...size, fonts: await ogFonts() },
  )
}
