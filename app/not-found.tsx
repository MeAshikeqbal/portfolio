import { SystemBar } from "@/components/dashboard/system-bar"
import { NotFoundPanel } from "@/components/site/not-found-panel"
import { SiteFooter } from "@/components/site/site-footer"
import { SiteNav } from "@/components/site/site-nav"

/** Unmatched URLs render outside the (root) layout, so this adds the site chrome itself. */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SystemBar status="warn" message="1 page not found" />
      <SiteNav />
      <div className="flex-1">
        <NotFoundPanel />
      </div>
      <SiteFooter />
    </div>
  )
}
