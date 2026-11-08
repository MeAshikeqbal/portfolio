import { BackToTop } from "@/components/back-to-top"
import { SystemBar } from "@/components/dashboard/system-bar"
import { SiteFooter } from "@/components/site/site-footer"
import { SiteNav } from "@/components/site/site-nav"
import { getCommandIndex } from "@/lib/api"
import { SanityLive } from "@/sanity/lib/live"

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const commandIndex = await getCommandIndex()

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-foreground px-3 py-2 text-background focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <SystemBar />
      <SiteNav commandIndex={commandIndex} />
      <div id="main" className="flex-1">
        {children}
      </div>
      <SiteFooter />
      <BackToTop />
      {/* Live content updates for the public site only (not the Studio or style guide). */}
      <SanityLive />
    </div>
  )
}
