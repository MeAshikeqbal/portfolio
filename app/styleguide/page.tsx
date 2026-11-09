import { PortableText } from "@portabletext/react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import type { ReactNode } from "react"
import { DataList, DataRow } from "@/components/dashboard/data-list"
import { portableTextComponents } from "@/components/portable-text/components"
import { Container, GridBackdrop, Section } from "@/components/dashboard/layout"
import { MetricGrid, MetricTile } from "@/components/dashboard/metric-tile"
import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/panel"
import { SectionHeader } from "@/components/dashboard/section-header"
import { Sparkline } from "@/components/dashboard/sparkline"
import { StatusDot } from "@/components/dashboard/status-dot"
import { StatusPill } from "@/components/dashboard/status-pill"
import { SystemBar } from "@/components/dashboard/system-bar"
import { SkillIcon } from "@/components/skill-icon"
import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { contrastRatio, readThemeTokens, type ThemeTokens } from "@/lib/design-tokens"
import { STATUSES } from "@/lib/status"
import { cn } from "@/lib/utils"
import {
  fixturePosts,
  fixtureProjects,
  fixtureSkills,
  fixtureTimeline,
} from "@/tests/fixtures/dashboard"
import { ToastDemo } from "./toast-demo"

/**
 * Living style guide and the design sign-off page for the "homelab dashboard" system.
 * Not linked, not indexed, and unavailable on the production deployment.
 */
export const metadata: Metadata = {
  title: "Style guide",
  robots: { index: false, follow: false },
}

export const dynamic = "force-static"

const NEUTRALS = [
  "background",
  "surface",
  "surface-2",
  "border",
  "border-strong",
  "foreground",
  "muted-foreground",
]

export default function StyleguidePage() {
  if (process.env.VERCEL_ENV === "production") notFound()
  const tokens = readThemeTokens()

  return (
    <main className="pb-24">
      <SystemBar />
      <Container className="flex items-center justify-between gap-4 py-10">
        <div>
          <p className="label-caps">design system</p>
          <h1 className="mt-2 text-display font-semibold">Homelab dashboard</h1>
          <p className="mt-3 max-w-prose text-muted-foreground">
            Monochrome UI; colour only carries status. Every token pair below is contrast-checked in{" "}
            <code className="font-mono text-sm">tests/unit/tokens.test.ts</code>.
          </p>
        </div>
        <ThemeToggle />
      </Container>

      <Container className="space-y-20">
        <Block id="colour" eyebrow="tokens" title="Colour">
          <div className="grid gap-4 lg:grid-cols-2">
            <ThemePreview mode="light" tokens={tokens.light} />
            <ThemePreview mode="dark" tokens={tokens.dark} />
          </div>
        </Block>

        <Block id="type" eyebrow="tokens" title="Typography">
          <div className="space-y-4">
            <p className="text-display font-semibold">Display — Ashik Eqbal</p>
            <p className="text-3xl font-semibold tracking-tight">Heading 2 — Selected work</p>
            <p className="text-xl font-semibold">Heading 3 — Why I started self-hosting</p>
            <p className="max-w-prose">
              Body — Geist Sans at 16px. I build and run things on the web and on my own hardware,
              and write about what breaks.
            </p>
            <p className="text-muted-foreground">Muted — supporting copy and descriptions.</p>
            <p className="label-caps">label-caps — services · incident log · uptime</p>
            <p className="font-mono text-sm">Geist Mono — const status = &quot;up&quot;</p>
            <p className="text-2xl font-semibold tabular">1,284 · 12.9K · 0.97</p>
          </div>
          <article className="prose mt-10 max-w-none">
            <h3>Prose sample</h3>
            <p>
              Blog posts use the typography plugin mapped onto the tokens.{" "}
              <a href="#type">Links are informational blue</a>, <strong>bold is ink</strong>, and{" "}
              <code>inline code</code> sits on a muted surface.
            </p>
            <blockquote>Colour always means something.</blockquote>
            <pre>
              <code>{`$ docker compose up -d\n[+] Running 1/1 · uptime-kuma  Started`}</code>
            </pre>
          </article>
        </Block>

        <Block id="status" eyebrow="primitives" title="Status">
          <div className="flex flex-wrap items-center gap-6">
            {STATUSES.map((status) => (
              <span key={status} className="flex items-center gap-2 text-sm">
                <StatusDot status={status} pulse={status === "up"} /> {status}
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusPill status="up" pulse>
              live
            </StatusPill>
            <StatusPill status="info">maintained</StatusPill>
            <StatusPill status="warn">degraded</StatusPill>
            <StatusPill status="down">down</StatusPill>
            <StatusPill status="idle">archived</StatusPill>
          </div>
        </Block>

        <Block id="data" eyebrow="primitives" title="Panels, metrics and rows">
          <MetricGrid>
            <MetricTile
              label="commits / wk"
              value="14"
              hint="last 12 weeks"
              trend={
                <Sparkline values={fixtureProjects[0].weeklyCommits} label="Commits per week" />
              }
            />
            <MetricTile label="stars" value="47" hint="across 3 repos" />
            <MetricTile label="posts" value="14" hint="since 2024" />
            <MetricTile label="uptime" value="99.9%" hint="homelab, 30d" />
          </MetricGrid>
          <Panel className="mt-6">
            <PanelHeader title="services" meta={<span>3 total</span>} />
            <DataList>
              {fixtureProjects.map((project) => (
                <DataRow
                  key={project.name}
                  href="#data"
                  title={project.name}
                  status={project.status}
                  description={project.description}
                  meta={[project.language, `★ ${project.stars}`, project.pushed]}
                  value={
                    <Sparkline
                      values={project.weeklyCommits}
                      label={`${project.name} commits per week`}
                    />
                  }
                />
              ))}
            </DataList>
          </Panel>
        </Block>

        <Block id="components" eyebrow="shadcn/ui" title="Components">
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel>
              <PanelHeader title="buttons & badges" />
              <PanelBody className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button>Primary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>default</Badge>
                  <Badge variant="secondary">secondary</Badge>
                  <Badge variant="outline">outline</Badge>
                </div>
                <ToastDemo />
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader title="form" />
              <PanelBody className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sg-email">Email</Label>
                  <Input id="sg-email" type="email" placeholder="you@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sg-message">Message</Label>
                  <Textarea id="sg-message" placeholder="What are you working on?" />
                </div>
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader title="tabs, tooltip, kbd" />
              <PanelBody className="space-y-4">
                <Tabs defaultValue="experience">
                  <TabsList>
                    <TabsTrigger value="experience">Experience</TabsTrigger>
                    <TabsTrigger value="education">Education</TabsTrigger>
                  </TabsList>
                  <TabsContent value="experience" className="text-sm text-muted-foreground">
                    Work history renders here.
                  </TabsContent>
                  <TabsContent value="education" className="text-sm text-muted-foreground">
                    Education renders here.
                  </TabsContent>
                </Tabs>
                <div className="flex items-center gap-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm">
                        Hover me
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Tooltips use the inverted surface</TooltipContent>
                  </Tooltip>
                  <KbdGroup>
                    <Kbd>⌘</Kbd>
                    <Kbd>K</Kbd>
                  </KbdGroup>
                </div>
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader title="dialog, avatar, skeleton" />
              <PanelBody className="flex flex-wrap items-center gap-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Open dialog
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Open a ticket</DialogTitle>
                      <DialogDescription>
                        Dialogs are the only surfaces with a shadow.
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
                <Avatar>
                  <AvatarFallback>AE</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </PanelBody>
            </Panel>

            <Panel className="lg:col-span-2">
              <PanelHeader title="command (⌘K, phase 7)" />
              <Command className="rounded-none">
                <CommandInput placeholder="Jump to…" />
                <CommandList>
                  <CommandGroup heading="Navigate">
                    <CommandItem>
                      Projects <CommandShortcut>G P</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                      Writing <CommandShortcut>G W</CommandShortcut>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </Panel>
          </div>
        </Block>

        <Block id="rich-text" eyebrow="cms" title="Rich text">
          <Panel>
            <PanelHeader title="blockContent" meta={<span>posts, case studies, /now</span>} />
            <div className="prose max-w-none p-6">
              <PortableText value={RICH_TEXT_SAMPLE} components={portableTextComponents} />
            </div>
          </Panel>
        </Block>

        <Block id="mockup" eyebrow="composition" title="Home page mockup (phase 4)">
          <HomeMockup />
        </Block>
      </Container>
    </main>
  )
}

const span = (key: string, text: string, marks: string[] = []) => ({
  _type: "span",
  _key: key,
  text,
  marks,
})

/** Every block type the Studio's blockContent offers (sanity/schemaTypes/blockContentType.ts). */
const RICH_TEXT_SAMPLE = [
  { _type: "block", _key: "h", style: "h3", markDefs: [], children: [span("h1", "Heading 3")] },
  {
    _type: "block",
    _key: "p",
    style: "normal",
    markDefs: [{ _type: "link", _key: "l", href: "/projects" }],
    children: [
      span("p1", "Paragraph with "),
      span("p2", "strong", ["strong"]),
      span("p3", ", "),
      span("p4", "emphasis", ["em"]),
      span("p5", ", "),
      span("p6", "inline code", ["code"]),
      span("p7", ", "),
      span("p8", "strike-through", ["strike-through"]),
      span("p9", " and a "),
      span("p10", "relative link", ["l"]),
      span("p11", "."),
    ],
  },
  ...["Plan the change", "Back up the dataset", "Run the migration"].map((text, i) => ({
    _type: "block",
    _key: `n${i}`,
    style: "normal",
    listItem: "number",
    level: 1,
    markDefs: [],
    children: [span(`n${i}s`, text)],
  })),
  {
    _type: "code",
    _key: "c",
    language: "typescript",
    filename: "sanity/lib/client.ts",
    highlightedLines: [3],
    code: 'import { createClient } from "next-sanity"\n\nexport const client = createClient({ apiVersion: "2026-11-01" })',
  },
  {
    _type: "callout",
    _key: "cn",
    tone: "note",
    text: "Callouts highlight a tip or an aside without breaking the flow of the text.",
  },
  {
    _type: "callout",
    _key: "cw",
    tone: "warning",
    title: "Before you start",
    text: "Take a backup first: the migration deletes the originals once the copy is verified.",
  },
]

function Block({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string
  eyebrow: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-10">
      <SectionHeader eyebrow={eyebrow} title={title} />
      {children}
    </section>
  )
}

/** Swatches for one theme, rendered inside a scoped `.light`/`.dark` wrapper with live contrast ratios. */
function ThemePreview({ mode, tokens }: { mode: "light" | "dark"; tokens: ThemeTokens }) {
  return (
    <div className={cn(mode, "rounded-lg border bg-background p-4 text-foreground")}>
      <p className="mb-3 label-caps">{mode}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {NEUTRALS.map((name) => (
          <Swatch key={name} name={name} color={`var(--${name})`} />
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {STATUSES.map((status) => {
          const text = contrastRatio(tokens, `status-${status}-fg`, `status-${status}-soft`)
          const dot = contrastRatio(tokens, `status-${status}`, "surface")
          return (
            <div
              key={status}
              className="flex items-center justify-between gap-3 rounded-md bg-surface px-3 py-2"
            >
              <StatusPill status={status}>{status}</StatusPill>
              <span className="label-caps tabular">
                text {text.toFixed(1)}:1 · dot {dot.toFixed(1)}:1
              </span>
            </div>
          )
        })}
      </div>
      <p className="mt-3 label-caps tabular">
        body {contrastRatio(tokens, "foreground", "background").toFixed(1)}:1 · muted{" "}
        {contrastRatio(tokens, "muted-foreground", "background").toFixed(1)}:1
      </p>
    </div>
  )
}

function Swatch({ name, color }: { name: string; color: string }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="h-10" style={{ background: color }} />
      <p className="truncate bg-surface px-2 py-1 font-mono text-[0.625rem] text-muted-foreground">
        {name}
      </p>
    </div>
  )
}

/** The Phase 4 home page, composed only from primitives and fixture data. */
function HomeMockup() {
  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <SystemBar />
      <div className="relative border-b">
        <GridBackdrop />
        <Container className="relative py-16 sm:py-20">
          <StatusPill status="up" pulse>
            available for work
          </StatusPill>
          <h2 className="mt-5 text-display font-semibold">Ashik Eqbal</h2>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Software engineer. I build for the web and run it on my own hardware — infrastructure,
            security and the occasional write-up when something breaks.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button>Résumé</Button>
            <Button variant="outline">Get in touch</Button>
          </div>
        </Container>
      </div>

      <Container>
        <Section className="py-12 sm:py-16">
          <SectionHeader
            eyebrow="services"
            title="Projects"
            action={{ href: "#mockup", label: "all projects" }}
          />
          <Panel>
            <PanelHeader
              title={
                <>
                  <StatusDot status="up" /> 3 services
                </>
              }
              meta={<span>stars · language · last push · commits/wk</span>}
            />
            <DataList>
              {fixtureProjects.map((project) => (
                <DataRow
                  key={project.name}
                  href="#mockup"
                  title={project.name}
                  status={project.status}
                  description={project.description}
                  meta={[project.language, `★ ${project.stars}`, project.pushed]}
                  value={
                    <Sparkline
                      values={project.weeklyCommits}
                      label={`${project.name} commits per week`}
                    />
                  }
                />
              ))}
            </DataList>
          </Panel>
        </Section>

        <Section className="grid gap-10 py-12 sm:py-16 lg:grid-cols-2">
          <div>
            <SectionHeader
              eyebrow="incident log"
              title="Writing"
              action={{ href: "#mockup", label: "all posts" }}
            />
            <Panel>
              <DataList>
                {fixturePosts.map((post) => (
                  <DataRow
                    key={post.title}
                    href="#mockup"
                    title={post.title}
                    meta={post.tags.map((tag) => `#${tag}`)}
                    value={<time className="label-caps">{post.date}</time>}
                  />
                ))}
              </DataList>
            </Panel>
          </div>
          <div>
            <SectionHeader eyebrow="uptime" title="Experience" />
            <ol className="relative space-y-6 border-l pl-6">
              {fixtureTimeline.map((entry) => (
                <li key={entry.title} className="relative">
                  <StatusDot
                    status={entry.status}
                    className="absolute top-1.5 -left-[1.8rem] size-2.5"
                  />
                  <p className="label-caps">{entry.year}</p>
                  <p className="font-medium">{entry.title}</p>
                  <p className="text-sm text-muted-foreground">{entry.org}</p>
                </li>
              ))}
            </ol>
          </div>
        </Section>

        <Section className="py-12 sm:py-16">
          <SectionHeader eyebrow="inventory" title="Stack" />
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {fixtureSkills.map((skill) => (
              <li
                key={skill.name}
                className="flex items-center gap-3 rounded-md border bg-surface px-3 py-2.5 text-sm"
              >
                <SkillIcon name={skill.icon} label="" className="size-5 shrink-0 text-foreground" />
                {skill.name}
              </li>
            ))}
          </ul>
        </Section>
      </Container>
    </div>
  )
}
