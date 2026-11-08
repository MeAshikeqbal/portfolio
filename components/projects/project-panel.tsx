import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { FaGithub } from "react-icons/fa6"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { Sparkline } from "@/components/dashboard/sparkline"
import { StatusPill } from "@/components/dashboard/status-pill"
import { LinkPreview } from "@/components/ui/link-preview"
import type { Project } from "@/lib/api"
import { projectMeta } from "@/lib/projects"
import { projectStatus } from "@/lib/status"

/** A project as a dashboard panel: status, title, description, metrics and links. */
export function ProjectPanel({ project }: { project: Project }) {
  const status = projectStatus(project.status)
  const weekly = project.githubData?.weeklyCommits ?? []
  const title = project.title ?? "Untitled project"

  return (
    <Panel className="flex h-full flex-col transition-colors hover:border-border-strong">
      <PanelHeader
        title={status ? <StatusPill status={status.status}>{status.label}</StatusPill> : "service"}
        meta={
          project.githubData?.license && project.githubData.license !== "Not specified" ? (
            <span>{project.githubData.license}</span>
          ) : undefined
        }
      />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h2 className="text-lg font-semibold tracking-tight">
          {project.slug ? (
            <Link href={`/projects/${project.slug}`} className="hover:underline">
              {title}
            </Link>
          ) : (
            title
          )}
        </h2>
        {project.description && (
          <p className="line-clamp-3 text-sm text-muted-foreground">{project.description}</p>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <p className="flex flex-wrap gap-x-3 gap-y-1 label-caps">
            {projectMeta(project).map((item) => (
              <span key={item}>{item}</span>
            ))}
          </p>
          {weekly.length > 1 && <Sparkline values={weekly} label={`${title} commits per week`} />}
        </div>
      </div>
      <div className="flex items-center gap-4 border-t px-4 py-2.5 text-sm">
        {project.github && (
          <a
            href={project.github}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <FaGithub aria-hidden /> Source
          </a>
        )}
        {project.url && (
          <LinkPreview
            url={project.url}
            className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            Live <ArrowUpRight className="size-3.5" aria-hidden />
          </LinkPreview>
        )}
        {project.slug && (
          <Link
            href={`/projects/${project.slug}`}
            className="ml-auto text-muted-foreground transition-colors hover:text-foreground"
          >
            Details →
          </Link>
        )}
      </div>
    </Panel>
  )
}
