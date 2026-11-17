import type { Education, Experience, PostCard, Project, Skill } from "@/lib/api"
import { byActivity } from "@/lib/projects"
import { siteConfig } from "@/lib/site"
import { SKILL_GROUPS } from "@/lib/skills"

/**
 * The résumé as Markdown, generated from the site's own content (experience, education,
 * projects, skills, writing), so it's never older than the site: /resume.md, and what
 * `curl -L itsashik.dev/resume` prints. /resume.pdf stays the designed PDF uploaded in the
 * Studio.
 */
export interface ResumeContent {
  experiences: readonly Experience[]
  education: readonly Education[]
  skills: readonly Skill[]
  projects: readonly Project[]
  posts: readonly PostCard[]
}

const clean = (text: string | null | undefined) => text?.replace(/\s+/g, " ").trim() ?? ""
const bare = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "")

export function resumeMarkdown(content: ResumeContent, generatedOn: Date): string {
  const out: string[] = []
  out.push(`# ${siteConfig.name}`)
  out.push(
    [
      siteConfig.role,
      bare(siteConfig.url),
      ...siteConfig.socialLinks.filter((l) => l.id !== "twitter").map((l) => bare(l.href)),
    ].join(" · "),
  )
  out.push(siteConfig.tagline)

  const jobs = content.experiences.flatMap((year) =>
    (year.works ?? []).map((work) => ({ year: clean(year.year), ...work })),
  )
  if (jobs.length > 0) {
    out.push("## Experience")
    for (const job of jobs) {
      const role = clean(job.name)
      const company = clean(job.company)
      out.push(
        [
          `### ${[role, company].filter(Boolean).join(", ")}${job.year ? ` (${job.year})` : ""}`,
          clean(job.desc),
        ]
          .filter(Boolean)
          .join("\n\n"),
      )
    }
  }

  if (content.education.length > 0) {
    out.push("## Education")
    for (const school of content.education) {
      out.push(
        [
          `### ${[clean(school.degree), clean(school.school)].filter(Boolean).join(", ")}${school.year ? ` (${clean(school.year)})` : ""}`,
          clean(school.desc),
        ]
          .filter(Boolean)
          .join("\n\n"),
      )
    }
  }

  const projects = byActivity([...content.projects]).filter((p) => p.status !== "archived")
  if (projects.length > 0) {
    out.push("## Projects")
    out.push(
      projects
        .map((project) => {
          const link = project.slug ? ` ${siteConfig.url}/projects/${project.slug}` : ""
          const tech = (project.tech ?? []).slice(0, 5).join(", ")
          return `- **${clean(project.title)}**${project.status ? ` (${project.status})` : ""}: ${clean(project.description)}${tech ? ` _${tech}._` : ""}${link}`
        })
        .join("\n"),
    )
  }

  const named = content.skills.filter((s) => s.name)
  const groups = SKILL_GROUPS.map((group) => ({
    label: group.label,
    names: named
      .filter((s) => s.category && group.categories.includes(s.category))
      .map((s) => s.name!),
  })).filter((group) => group.names.length > 0)
  if (groups.length > 0) {
    out.push("## Skills")
    out.push(groups.map((group) => `- **${group.label}:** ${group.names.join(", ")}`).join("\n"))
  }

  const posts = content.posts.filter((p) => p.slug).slice(0, 3)
  if (posts.length > 0) {
    out.push("## Writing")
    out.push(
      posts
        .map(
          (post) =>
            `- [${clean(post.title)}](${siteConfig.url}/post/${post.slug})${post.publishedAt ? ` (${post.publishedAt.slice(0, 7)})` : ""}`,
        )
        .join("\n"),
    )
  }

  out.push(
    `---\n\nGenerated from ${bare(siteConfig.url)} on ${generatedOn.toISOString().slice(0, 10)}. ` +
      `PDF: ${siteConfig.url}/resume.pdf`,
  )
  return `${out.join("\n\n")}\n`
}
