import type { Project } from "@/lib/api"
import { formatMonth } from "@/lib/format"

const LICENSE_SHORT: Record<string, string> = {
  "MIT License": "MIT",
  "Apache License 2.0": "Apache-2.0",
  "GNU General Public License v3.0": "GPL-3.0",
  "GNU General Public License v2.0": "GPL-2.0",
  "GNU Affero General Public License v3.0": "AGPL-3.0",
  "GNU Lesser General Public License v3.0": "LGPL-3.0",
  'BSD 3-Clause "New" or "Revised" License': "BSD-3-Clause",
  'BSD 2-Clause "Simplified" License': "BSD-2-Clause",
  "Mozilla Public License 2.0": "MPL-2.0",
  "The Unlicense": "Unlicense",
}

/** GitHub's license name as a short SPDX-style id ("GPL-3.0"), or null when there's none. */
export function shortLicense(name: string | null | undefined): string | null {
  if (!name || name === "Not specified" || name === "Other") return null
  return LICENSE_SHORT[name] ?? name
}

/** Facts shown beside a project, skipping anything empty or zero. */
export function projectMeta(project: Project): string[] {
  const gh = project.githubData
  const pushed = formatMonth(gh?.pushedAt)
  return [
    gh?.language,
    gh?.stars ? `★ ${gh.stars}` : null,
    gh?.commits ? `${gh.commits} ${gh.commits === 1 ? "commit" : "commits"}` : null,
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

/** Whether a weekly commit series has anything to draw: a flat zero line reports nothing. */
export function hasActivity(weekly: readonly number[] | null | undefined): weekly is number[] {
  return Array.isArray(weekly) && weekly.length > 1 && weekly.some((value) => value > 0)
}

/**
 * Most recently pushed first, so a short list shows what's actually moving. Archived
 * projects and projects without GitHub data go last; ties keep their CMS order.
 */
export function byActivity<T extends Pick<Project, "status" | "githubData">>(projects: T[]): T[] {
  const pushed = (p: T) => {
    const time = p.githubData?.pushedAt ? Date.parse(p.githubData.pushedAt) : NaN
    return Number.isNaN(time) ? -Infinity : time
  }
  const rank = (p: T) => (p.status === "archived" ? 1 : 0)
  return projects
    .map((project, index) => ({ project, index }))
    .sort(
      (a, b) =>
        rank(a.project) - rank(b.project) ||
        pushed(b.project) - pushed(a.project) ||
        a.index - b.index,
    )
    .map(({ project }) => project)
}
