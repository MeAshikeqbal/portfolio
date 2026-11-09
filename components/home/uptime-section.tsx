import Image from "next/image"
import type { ReactNode } from "react"
import { Container, Section } from "@/components/dashboard/layout"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { SectionHeader } from "@/components/dashboard/section-header"
import { StatusDot } from "@/components/dashboard/status-dot"
import { getEducation, getExperiences } from "@/lib/api"
import { isCurrentPeriod } from "@/lib/format"
import { urlFor } from "@/sanity/lib/image"

interface Entry {
  key: string
  period: string | null
  title: string | null
  org: string | null
  desc: string | null
  logo: ReactNode
}

export async function UptimeSection() {
  const [experiences, education] = await Promise.all([getExperiences(), getEducation()])

  const work: Entry[] = experiences.flatMap((experience) =>
    (experience.works ?? []).map((job) => ({
      key: job._key,
      period: experience.year,
      title: job.name,
      org: job.company,
      desc: job.desc,
      // The schema field is spelled `copmanyLogo`; renaming it would orphan existing data.
      logo: job.copmanyLogo?.asset && (
        <Logo src={urlFor(job.copmanyLogo).width(64).height(64).url()} />
      ),
    })),
  )
  const study: Entry[] = education.map((edu) => ({
    key: edu._id,
    period: edu.year,
    title: edu.degree,
    org: edu.school,
    desc: edu.desc,
    logo: edu.schoolLogo?.asset && <Logo src={urlFor(edu.schoolLogo).width(64).height(64).url()} />,
  }))

  if (work.length === 0 && study.length === 0) return null

  return (
    <Section id="uptime" className="border-t">
      <Container>
        <SectionHeader title="Experience & education" />
        <div className="grid gap-6 lg:grid-cols-2">
          {work.length > 0 && <Log title="experience" entries={work} />}
          {study.length > 0 && <Log title="education" entries={study} />}
        </div>
      </Container>
    </Section>
  )
}

function Log({ title, entries }: { title: string; entries: Entry[] }) {
  return (
    <Panel>
      <PanelHeader
        title={title}
        meta={
          <span>
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        }
      />
      <ol className="relative m-4 space-y-6 border-l pl-6">
        {entries.map((entry) => {
          const current = isCurrentPeriod(entry.period)
          return (
            <li key={entry.key} className="relative">
              <StatusDot
                status={current ? "up" : "idle"}
                label={current ? "current" : "past"}
                className="absolute top-1 -left-[1.82rem] size-2.5 ring-4 ring-surface"
              />
              <p className="label-caps">{entry.period}</p>
              <div className="mt-1 flex items-start gap-3">
                {entry.logo}
                <div className="min-w-0">
                  <p className="font-medium text-pretty">{entry.title}</p>
                  <p className="text-sm text-muted-foreground">{entry.org}</p>
                </div>
              </div>
              {entry.desc && <p className="mt-2 text-sm text-muted-foreground">{entry.desc}</p>}
            </li>
          )
        })}
      </ol>
    </Panel>
  )
}

function Logo({ src }: { src: string }) {
  return (
    <Image
      src={src}
      alt=""
      width={32}
      height={32}
      className="mt-0.5 size-8 shrink-0 rounded-md bg-icon-plate object-contain p-0.5 ring-1 ring-border"
    />
  )
}
