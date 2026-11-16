import type { Metadata } from "next"
import { Suspense } from "react"
import { Container, Section } from "@/components/dashboard/layout"
import { SectionHeader } from "@/components/dashboard/section-header"
import { ProjectPanel } from "@/components/projects/project-panel"
import { ProjectsBrowser } from "@/components/projects/projects-browser"
import { getProjects } from "@/lib/api"
import { getTranslations } from "next-intl/server"
import { localizedPageMetadata } from "@/i18n/metadata"
import { siteConfig } from "@/lib/site"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta")
  return localizedPageMetadata({
    title: t("projectsTitle"),
    description: t("projectsDescription", { name: siteConfig.name }),
    path: "/projects",
  })
}

export default async function ProjectsPage() {
  const [projects, t] = await Promise.all([getProjects(), getTranslations("meta")])

  // Render time, passed down so the client re-renders statuses (which depend on push age)
  // exactly as the server did: no hydration mismatch when a project crosses into "dormant".
  const now = new Date().toISOString()

  return (
    <main>
      <Section className="pt-12 sm:pt-16">
        <Container>
          <SectionHeader as="h1" title={t("projectsTitle")} description={t("projectsHeader")} />
          {/* The browser reads filters from the URL; the static fallback lists everything. */}
          <Suspense
            fallback={
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <li key={project._id}>
                    <ProjectPanel project={project} now={now} />
                  </li>
                ))}
              </ul>
            }
          >
            <ProjectsBrowser projects={projects} now={now} />
          </Suspense>
        </Container>
      </Section>
    </main>
  )
}
