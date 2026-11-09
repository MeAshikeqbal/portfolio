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
  return [
    gh?.language,
    gh?.stars ? `★ ${gh.stars}` : null,
    gh?.commits ? `${gh.commits} ${gh.commits === 1 ? "commit" : "commits"}` : null,
    gh?.pushedAt ? `pushed ${formatMonth(gh.pushedAt)}` : null,
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
