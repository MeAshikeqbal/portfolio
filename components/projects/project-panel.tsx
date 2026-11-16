import { ArrowUpRight } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { FaGithub } from "react-icons/fa6"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { Sparkline } from "@/components/dashboard/sparkline"
import { StatusPill } from "@/components/dashboard/status-pill"
import { LinkPreview } from "@/components/ui/link-preview"
import type { Project } from "@/lib/api"
import { hasActivity, projectHref, projectMeta, shortLicense } from "@/lib/projects"
import { projectStatus } from "@/lib/status"
import { Link } from "@/i18n/navigation"

/** A project as a dashboard panel: status, title, description, metrics and links. */
export function ProjectPanel({ project, now }: { project: Project; now?: string }) {
  const t = useTranslations("projects")
  const locale = useLocale()
  const status = projectStatus(project, now ? new Date(now) : undefined)
  const weekly = project.githubData?.weeklyCommits ?? []
  const title = project.title ?? t("untitled")
  const meta = projectMeta(project, {
    locale,
    commits: (count) => t("commits", { count }),
    pushed: (date) => t("pushed", { date }),
  })
  const detailsHref = project.slug ? projectHref(project) : undefined
  const license = shortLicense(project.githubData?.license)

  return (
    <Panel className="flex h-full flex-col transition-colors hover:border-border-strong">
      <PanelHeader
        title={
          status ? (
            <StatusPill status={status.status}>{t("status", { status: status.label })}</StatusPill>
          ) : (
            t("service")
          )
        }
        meta={
          license ? (
            // Short id so a long name ("GNU General Public License v3.0") can't squeeze the status.
            <span title={project.githubData?.license ?? undefined}>{license}</span>
          ) : undefined
        }
      />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h2 className="text-lg font-semibold tracking-tight">
          {detailsHref ? (
            <Link href={detailsHref} className="hover:underline">
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
            {meta.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </p>
          {hasActivity(weekly) && (
            <Sparkline values={weekly} label={t("commitsPerWeek", { title })} />
          )}
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
            <FaGithub aria-hidden /> {t("source")}
          </a>
        )}
        {project.url && (
          <LinkPreview
            url={project.url}
            className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("live")} <ArrowUpRight className="size-3.5" aria-hidden />
          </LinkPreview>
        )}
        {detailsHref && (
          <Link
            href={detailsHref}
            className="ml-auto text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("details")}
          </Link>
        )}
      </div>
    </Panel>
  )
}
