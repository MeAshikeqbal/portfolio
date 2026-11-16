"use client"

import { useTranslations } from "next-intl"
import { useMemo } from "react"
import { ChipFilter } from "@/components/dashboard/chip-filter"
import { Panel } from "@/components/dashboard/panel"
import { SearchInput } from "@/components/dashboard/search-input"
import { useUrlParam } from "@/hooks/use-url-param"
import type { Project } from "@/lib/api"
import { projectTags, tagsByUse } from "@/lib/projects"
import { projectStatus } from "@/lib/status"
import { ProjectPanel } from "./project-panel"

/** Lifecycle order, liveliest first (labels from projectStatus). */
const STATUS_ORDER = ["active", "maintained", "dormant", "archived"]
/** Stack chips shown before "+N more": the most-used tags. */
const STACK_LIMIT = 10

/** Searchable, filterable project grid; filters live in the URL (?q=, ?status=, ?tag=). */
export function ProjectsBrowser({ projects, now }: { projects: Project[]; now: string }) {
  const t = useTranslations("projects")
  const at = useMemo(() => new Date(now), [now])
  const [query, setQuery] = useUrlParam("q")
  const [status, setStatus] = useUrlParam("status")
  const [tag, setTag] = useUrlParam("tag")

  const statuses = useMemo(() => {
    const present = new Set(projects.map((p) => projectStatus(p, at)?.label))
    return STATUS_ORDER.filter((s) => present.has(s))
  }, [projects, at])
  const tags = useMemo(() => tagsByUse(projects), [projects])

  const needle = query.trim().toLowerCase()
  const visible = projects.filter((project) => {
    const text = `${project.title ?? ""} ${project.description ?? ""}`.toLowerCase()
    if (needle && !text.includes(needle)) return false
    if (status && projectStatus(project, at)?.label !== status) return false
    if (tag && !projectTags(project).includes(tag)) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput label={t("search")} value={query} onChange={setQuery} />
        <p className="label-caps" aria-live="polite">
          {t("count", { visible: visible.length, total: projects.length })}
        </p>
      </div>

      {(statuses.length > 1 || tags.length > 1) && (
        <div className="flex flex-col gap-2">
          {statuses.length > 1 && (
            <ChipFilter
              label={t("filterStatus")}
              options={statuses}
              formatOption={(option) => t("status", { status: option })}
              value={status}
              onChange={setStatus}
            />
          )}
          {tags.length > 1 && (
            <ChipFilter
              label={t("filterStack")}
              options={tags}
              value={tag}
              onChange={setTag}
              limit={STACK_LIMIT}
            />
          )}
        </div>
      )}

      {visible.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((project) => (
            <li key={project._id}>
              <ProjectPanel project={project} now={now} />
            </li>
          ))}
        </ul>
      ) : (
        // Same empty state as the posts log: a panel, not a dashed placeholder.
        <Panel>
          <p className="p-10 text-center text-muted-foreground">{t("empty")}</p>
        </Panel>
      )}
    </div>
  )
}
