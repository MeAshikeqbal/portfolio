import { SystemBar } from "@/components/dashboard/system-bar"
import { NotFoundPanel } from "@/components/site/not-found-panel"
import { SiteFooter } from "@/components/site/site-footer"
import { SiteNav } from "@/components/site/site-nav"
import { useTranslations } from "next-intl"

/**
 * A 404 raised by the [lang] layout itself (outside the (site) layout), so this adds the site
 * chrome. Unmatched URLs inside the site render (site)/[...rest] and its not-found instead.
 */
export default function NotFound() {
  const t = useTranslations("status")
  return (
    <div className="flex min-h-screen flex-col">
      <SystemBar notice={{ status: "warn", label: t("pageNotFound") }} />
      <SiteNav />
      <div className="flex-1">
        <NotFoundPanel />
      </div>
      <SiteFooter />
    </div>
  )
}
