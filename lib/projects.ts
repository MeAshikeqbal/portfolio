import type { Project } from "@/lib/api"
import { formatMonth } from "@/lib/format"

/** Facts shown beside a project, skipping anything empty or zero. */
export function projectMeta(project: Project): string[] {
  const gh = project.githubData
  const pushed = formatMonth(gh?.pushedAt)
  return [
    gh?.language,
    gh?.stars ? `★ ${gh.stars}` : null,
    gh?.commits ? `${gh.commits} commits` : null,
    pushed ? `pushed ${pushed}` : null,
  ].filter((item): item is string => Boolean(item))
}

/** The project's own page when it has a slug, otherwise its live site or repo. */
export function projectHref(project: Pick<Project, "slug" | "url" | "github">): string | undefined {
  if (project.slug) return `/projects/${encodeURIComponent(project.slug)}`
  return project.url || project.github || undefined
}

/** Languages and tech tags, de-duplicated, for filtering. */
export function projectTags(project: Project): string[] {
  return [
    ...new Set(
      [project.githubData?.language, ...(project.tech ?? [])].filter((t): t is string =>
        Boolean(t),
      ),
    ),
  ]
}
