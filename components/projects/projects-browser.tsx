"use client"

import { useMemo } from "react"
import { ChipFilter } from "@/components/dashboard/chip-filter"
import { Panel } from "@/components/dashboard/panel"
import { SearchInput } from "@/components/dashboard/search-input"
import { useUrlParam } from "@/hooks/use-url-param"
import type { Project } from "@/lib/api"
import { projectTags } from "@/lib/projects"
import { projectStatus } from "@/lib/status"
import { ProjectPanel } from "./project-panel"

/** Searchable, filterable project grid; filters live in the URL (?q=, ?status=, ?tag=). */
export function ProjectsBrowser({ projects, now }: { projects: Project[]; now: string }) {
  const at = useMemo(() => new Date(now), [now])
  const [query, setQuery] = useUrlParam("q")
  const [status, setStatus] = useUrlParam("status")
  const [tag, setTag] = useUrlParam("tag")

  const statuses = useMemo(
    () => [
      ...new Set(
        projects.map((p) => projectStatus(p, at)?.label).filter((s): s is string => Boolean(s)),
      ),
    ],
    [projects, at],
  )
  const tags = useMemo(() => [...new Set(projects.flatMap(projectTags))].sort(), [projects])

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
        <SearchInput label="Search projects" value={query} onChange={setQuery} />
        <p className="label-caps" aria-live="polite">
          {visible.length} of {projects.length} projects
        </p>
      </div>

      {(statuses.length > 1 || tags.length > 1) && (
        <div className="flex flex-col gap-2">
          {statuses.length > 1 && (
            <ChipFilter label="status" options={statuses} value={status} onChange={setStatus} />
          )}
          {tags.length > 1 && (
            <ChipFilter label="stack" options={tags} value={tag} onChange={setTag} />
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
          <p className="p-10 text-center text-muted-foreground">No projects match these filters.</p>
        </Panel>
      )}
    </div>
  )
}
