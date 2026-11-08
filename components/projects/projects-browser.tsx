"use client"

import { Search } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { Input } from "@/components/ui/input"
import type { Project } from "@/lib/api"
import { projectTags } from "@/lib/projects"
import { projectStatus } from "@/lib/status"
import { cn } from "@/lib/utils"
import { ProjectPanel } from "./project-panel"

/**
 * Searchable, filterable project grid. Filters live in the URL (?q=, ?status=, ?tag=)
 * so a filtered view can be shared or bookmarked.
 */
export function ProjectsBrowser({ projects }: { projects: Project[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const query = params.get("q") ?? ""
  const status = params.get("status")
  const tag = params.get("tag")

  const statuses = useMemo(
    () => [
      ...new Set(
        projects.map((p) => projectStatus(p.status)?.label).filter((s): s is string => Boolean(s)),
      ),
    ],
    [projects],
  )
  const tags = useMemo(() => [...new Set(projects.flatMap(projectTags))].sort(), [projects])

  const visible = projects.filter((project) => {
    const text = `${project.title ?? ""} ${project.description ?? ""}`.toLowerCase()
    if (query && !text.includes(query.toLowerCase())) return false
    if (status && projectStatus(project.status)?.label !== status) return false
    if (tag && !projectTags(project).includes(tag)) return false
    return true
  })

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    const search = next.toString()
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Filter projects…"
            aria-label="Filter projects"
            defaultValue={query}
            onChange={(event) => update("q", event.target.value.trim() || null)}
            className="pl-9"
          />
        </div>
        <p className="label-caps" aria-live="polite">
          {visible.length} of {projects.length} shown
        </p>
      </div>

      {(statuses.length > 1 || tags.length > 1) && (
        <div className="flex flex-col gap-2">
          {statuses.length > 1 && (
            <ChipRow
              label="status"
              options={statuses}
              value={status}
              onChange={(v) => update("status", v)}
            />
          )}
          {tags.length > 1 && (
            <ChipRow label="stack" options={tags} value={tag} onChange={(v) => update("tag", v)} />
          )}
        </div>
      )}

      {visible.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((project) => (
            <li key={project._id}>
              <ProjectPanel project={project} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          No projects match these filters.
        </p>
      )}
    </div>
  )
}

function ChipRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string | null
  onChange: (value: string | null) => void
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label={`Filter by ${label}`}
    >
      <span className="w-14 label-caps">{label}</span>
      {[null, ...options].map((option) => {
        const active = value === option
        return (
          <button
            key={option ?? "all"}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option)}
            className={cn(
              "rounded-full border px-2.5 py-1 font-mono text-xs transition-colors",
              active
                ? "border-foreground bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option ?? "all"}
          </button>
        )
      })}
    </div>
  )
}
