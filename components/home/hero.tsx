import { ArrowRight, FileText, Rss } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Container, GridBackdrop } from "@/components/dashboard/layout"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { StatusPill } from "@/components/dashboard/status-pill"
import { HomelabList } from "@/components/home/homelab-list"
import { LiveLine } from "@/components/home/live-line"
import { Button } from "@/components/ui/button"
import { getCvUrl, getHomeStats } from "@/lib/api"
import { readLabStatus } from "@/lib/lab/store"
import { formatCompact, formatDate } from "@/lib/format"
import { siteConfig } from "@/lib/site"

export async function Hero() {
  const [cvUrl, stats, lab] = await Promise.all([
    getCvUrl(),
    getHomeStats(),
    // Only the machines' names, to pick the rows; cached for an hour (names rarely change).
    readLabStatus(process.env, fetch, { revalidate: 3600 }),
  ])
  const { availability } = siteConfig
  const latest = stats.latestPost?.slug && stats.latestPost.title ? stats.latestPost : null

  // Only counts that exist: commits stay hidden until the GitHub sync has written some.
  const metrics = [
    { label: "posts", value: stats.posts },
    { label: "projects", value: stats.projects },
    ...(stats.commits > 0 ? [{ label: "commits/yr", value: stats.commits }] : []),
  ]

  return (
    <section id="home" className="relative overflow-hidden border-b">
      <GridBackdrop />
      <Container className="relative grid gap-8 py-10 sm:gap-12 sm:py-20 lg:grid-cols-[1.35fr_1fr] lg:items-center">
        <div>
          <div className="flex items-center gap-4 sm:gap-5">
            <Image
              src="/me.jpeg"
              alt=""
              width={72}
              height={72}
              priority
              className="size-14 shrink-0 rounded-full object-cover ring-1 ring-border sm:size-18"
            />
            <h1 className="text-display font-semibold">{siteConfig.name}</h1>
          </div>
          <p className="mt-5 max-w-xl text-lg text-pretty text-muted-foreground sm:mt-6">
            {siteConfig.tagline}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3 sm:mt-8">
            {cvUrl && (
              <Button asChild>
                {/* Served from our own domain (app/resume.pdf/route.ts), not the Sanity CDN. */}
                <a href="/resume.pdf" target="_blank" rel="noopener">
                  <FileText /> Résumé
                  <span className="sr-only"> (PDF, opens in a new tab)</span>
                </a>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/#contact">Get in touch</Link>
            </Button>
            <Button asChild variant="ghost" className="text-muted-foreground">
              <a href="/rss.xml">
                <Rss /> Follow via RSS
              </a>
            </Button>
          </div>
        </div>

        <Panel>
          {/* Only when there's something to say: no decorative "node" header. */}
          {availability && (
            <PanelHeader
              title="availability"
              meta={
                <StatusPill status={availability.status} pulse={availability.status === "up"}>
                  {availability.label}
                </StatusPill>
              }
            />
          )}

          {latest && (
            <Link
              href={`/post/${latest.slug}`}
              className="group flex items-start gap-3 border-b px-4 py-3.5 transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:-outline-offset-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block label-caps">
                  latest post
                  {latest.publishedAt && (
                    <>
                      {" · "}
                      <time dateTime={latest.publishedAt}>{formatDate(latest.publishedAt)}</time>
                    </>
                  )}
                </span>
                <span className="mt-1 block font-medium text-pretty">{latest.title}</span>
              </span>
              <ArrowRight
                aria-hidden
                className="mt-5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          )}

          <HomelabList items={stats.homelab} machines={lab?.nodes.map((n) => n.name)} />
          <LiveLine />

          <dl
            className="grid divide-x"
            style={{ gridTemplateColumns: `repeat(${metrics.length}, minmax(0, 1fr))` }}
          >
            {metrics.map((metric) => (
              <div key={metric.label} className="px-4 py-3">
                <dt className="label-caps">{metric.label}</dt>
                <dd className="mt-1 text-2xl font-semibold tracking-tight tabular">
                  {formatCompact(metric.value)}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
      </Container>
    </section>
  )
}
