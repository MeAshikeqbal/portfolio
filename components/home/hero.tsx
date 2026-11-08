import { FileDown, Rss } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { FaGithub, FaLinkedin, FaXTwitter } from "react-icons/fa6"
import { Container, GridBackdrop } from "@/components/dashboard/layout"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { StatusDot } from "@/components/dashboard/status-dot"
import { StatusPill } from "@/components/dashboard/status-pill"
import { Button } from "@/components/ui/button"
import { getCvUrl, getHomeStats } from "@/lib/api"
import { formatCompact, formatDate } from "@/lib/format"
import { siteConfig } from "@/lib/site"

const socials = [
  { icon: FaGithub, href: siteConfig.socials.github, label: "GitHub" },
  { icon: FaLinkedin, href: siteConfig.socials.linkedin, label: "LinkedIn" },
  { icon: FaXTwitter, href: siteConfig.socials.twitter, label: "X (Twitter)" },
]

export async function Hero() {
  const [cvUrl, stats] = await Promise.all([getCvUrl(), getHomeStats()])
  const { availability } = siteConfig

  const metrics = [
    { label: "posts", value: stats.posts },
    { label: "projects", value: stats.projects },
    { label: "commits", value: stats.commits },
    { label: "skills", value: stats.skills },
  ]

  return (
    <section id="home" className="relative overflow-hidden border-b">
      <GridBackdrop />
      <Container className="relative grid gap-12 py-16 sm:py-24 lg:grid-cols-[1.35fr_1fr] lg:items-center">
        <div>
          {availability && (
            <StatusPill
              status={availability.status}
              pulse={availability.status === "up"}
              className="mb-5"
            >
              {availability.label}
            </StatusPill>
          )}
          <p className="label-caps">{siteConfig.role}</p>
          <h1 className="mt-3 text-display font-semibold">{siteConfig.name}</h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">{siteConfig.tagline}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {cvUrl && (
              <Button asChild>
                <a href={cvUrl} download={`${siteConfig.name} CV.pdf`}>
                  <FileDown /> Résumé
                </a>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/#contact">Open a ticket</Link>
            </Button>
            <div className="ml-1 flex items-center gap-1">
              {socials.map(({ icon: Icon, href, label }) => (
                <Button
                  key={href}
                  asChild
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                >
                  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                    <Icon />
                  </a>
                </Button>
              ))}
              <Button asChild variant="ghost" size="icon" className="text-muted-foreground">
                <a href="/rss.xml" aria-label="RSS feed">
                  <Rss />
                </a>
              </Button>
            </div>
          </div>
        </div>

        <Panel>
          <PanelHeader
            title={
              <>
                <StatusDot status="up" /> node · itsashik
              </>
            }
            meta={<span>online</span>}
          />
          <div className="flex items-center gap-4 p-4">
            <Image
              src="/me.jpeg"
              alt={siteConfig.name}
              width={64}
              height={64}
              priority
              className="size-16 rounded-full object-cover ring-1 ring-border"
            />
            <div className="min-w-0">
              <p className="font-medium">{siteConfig.name}</p>
              <p className="text-sm text-muted-foreground">{siteConfig.role}</p>
            </div>
          </div>
          <dl className="grid grid-cols-2 border-t sm:grid-cols-4 lg:grid-cols-2">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="border-r border-b p-4 last:border-r-0 even:border-r-0 sm:even:border-r lg:even:border-r-0"
              >
                <dt className="label-caps">{metric.label}</dt>
                <dd className="mt-1 text-2xl font-semibold tracking-tight tabular">
                  {formatCompact(metric.value)}
                </dd>
              </div>
            ))}
          </dl>
          {stats.latestPost && (
            <p className="px-4 py-3 label-caps">last post · {formatDate(stats.latestPost)}</p>
          )}
        </Panel>
      </Container>
    </section>
  )
}
