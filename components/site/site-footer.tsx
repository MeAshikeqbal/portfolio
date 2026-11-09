import Link from "next/link"
import { Container } from "@/components/dashboard/layout"
import { StatusDot } from "@/components/dashboard/status-dot"
import { siteConfig } from "@/lib/site"

const siteLinks = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Writing", href: "/post" },
  { label: "RSS feed", href: "/rss.xml" },
  { label: "Sitemap", href: "/sitemap.xml" },
]

const elsewhere = [...siteConfig.socialLinks, { label: "Source code", href: siteConfig.repo }]

/** `extraLinks`: pages that only exist once they have content (e.g. /uses, /now). */
export function SiteFooter({
  extraLinks = [],
}: {
  extraLinks?: { label: string; href: string }[]
}) {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)

  return (
    <footer className="mt-auto border-t bg-surface">
      <Container className="grid gap-10 py-12 sm:grid-cols-[1.6fr_1fr_1fr]">
        <div className="max-w-sm">
          <p className="font-semibold">{siteConfig.name}</p>
          <p className="mt-2 text-sm text-muted-foreground">{siteConfig.tagline}</p>
        </div>
        <FooterLinks title="site" links={[...siteLinks, ...extraLinks]} />
        <FooterLinks title="elsewhere" links={elsewhere} external />
      </Container>
      <div className="border-t">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-4 label-caps">
          <span>
            © {new Date().getFullYear()} {siteConfig.name}
          </span>
          <span className="flex items-center gap-2">
            <StatusDot status="up" /> operational · build {sha ?? "local"}
          </span>
        </Container>
      </div>
    </footer>
  )
}

function FooterLinks({
  title,
  links,
  external = false,
}: {
  title: string
  links: { label: string; href: string }[]
  external?: boolean
}) {
  return (
    <nav aria-label={title}>
      <p className="label-caps">{title}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            {external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label} ↗
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
