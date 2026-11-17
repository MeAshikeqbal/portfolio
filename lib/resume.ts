import type { Education, Experience, PostCard, Project, Skill } from "@/lib/api"
import { byActivity } from "@/lib/projects"
import { siteConfig } from "@/lib/site"
import { SKILL_GROUPS } from "@/lib/skills"

/**
 * The résumé, generated from the site's own content (experience, education, projects, skills,
 * writing), so it's never older than the site. One shape (`resumeData`) feeds both formats:
 * /resume.pdf (lib/resume-pdf.tsx) and /resume.md, which `curl -L itsashik.dev/resume` prints.
 */
export interface ResumeContent {
  experiences: readonly Experience[]
  education: readonly Education[]
  skills: readonly Skill[]
  projects: readonly Project[]
  posts: readonly PostCard[]
}

export interface ResumeEntry {
  title: string
  org: string
  period: string
  description: string
}

export interface ResumeData {
  name: string
  role: string
  tagline: string
  links: { label: string; url: string }[]
  experience: ResumeEntry[]
  education: ResumeEntry[]
  projects: {
    title: string
    status: string | null
    description: string
    tech: string[]
    url: string | null
  }[]
  skills: { label: string; names: string[] }[]
  writing: { title: string; url: string; date: string | null }[]
  /** "2026-11-17" */
  generatedOn: string
}

const clean = (text: string | null | undefined) => text?.replace(/\s+/g, " ").trim() ?? ""
export const bareUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "")

export function resumeData(content: ResumeContent, generatedOn: Date): ResumeData {
  const named = content.skills.filter((s) => s.name)
  return {
    name: siteConfig.name,
    role: siteConfig.role,
    tagline: siteConfig.tagline,
    links: [
      { label: "Site", url: siteConfig.url },
      ...siteConfig.socialLinks
        .filter((l) => l.id !== "twitter")
        .map((l) => ({ label: l.label, url: l.href })),
    ],
    experience: content.experiences.flatMap((year) =>
      (year.works ?? []).map((work) => ({
        title: clean(work.name),
        org: clean(work.company),
        period: clean(year.year),
        description: clean(work.desc),
      })),
    ),
    education: content.education.map((school) => ({
      title: clean(school.degree),
      org: clean(school.school),
      period: clean(school.year),
      description: clean(school.desc),
    })),
    projects: byActivity([...content.projects])
      .filter((p) => p.status !== "archived")
      .map((p) => ({
        title: clean(p.title),
        status: p.status,
        description: clean(p.description),
        tech: (p.tech ?? []).slice(0, 5),
        url: p.slug ? `${siteConfig.url}/projects/${p.slug}` : null,
      })),
    skills: SKILL_GROUPS.map((group) => ({
      label: group.label,
      names: named
        .filter((s) => s.category && group.categories.includes(s.category))
        .map((s) => s.name!),
    })).filter((group) => group.names.length > 0),
    writing: content.posts
      .filter((p) => p.slug)
      .slice(0, 3)
      .map((p) => ({
        title: clean(p.title),
        url: `${siteConfig.url}/post/${p.slug}`,
        date: p.publishedAt ? p.publishedAt.slice(0, 7) : null,
      })),
    generatedOn: generatedOn.toISOString().slice(0, 10),
  }
}

const heading = (entry: ResumeEntry) =>
  `### ${[entry.title, entry.org].filter(Boolean).join(", ")}${entry.period ? ` (${entry.period})` : ""}`

export function resumeMarkdown(content: ResumeContent, generatedOn: Date): string {
  const data = resumeData(content, generatedOn)
  const out: string[] = [
    `# ${data.name}`,
    [data.role, ...data.links.map((l) => bareUrl(l.url))].join(" · "),
    data.tagline,
  ]
  const entries = (title: string, list: ResumeEntry[]) => {
    if (list.length === 0) return
    out.push(`## ${title}`)
    for (const entry of list) {
      out.push([heading(entry), entry.description].filter(Boolean).join("\n\n"))
    }
  }
  entries("Experience", data.experience)
  entries("Education", data.education)
  if (data.projects.length > 0) {
    out.push("## Projects")
    out.push(
      data.projects
        .map(
          (p) =>
            `- **${p.title}**${p.status ? ` (${p.status})` : ""}: ${p.description}` +
            `${p.tech.length ? ` _${p.tech.join(", ")}._` : ""}${p.url ? ` ${p.url}` : ""}`,
        )
        .join("\n"),
    )
  }
  if (data.skills.length > 0) {
    out.push("## Skills")
    out.push(data.skills.map((g) => `- **${g.label}:** ${g.names.join(", ")}`).join("\n"))
  }
  if (data.writing.length > 0) {
    out.push("## Writing")
    out.push(
      data.writing.map((w) => `- [${w.title}](${w.url})${w.date ? ` (${w.date})` : ""}`).join("\n"),
    )
  }
  out.push(
    `---\n\nGenerated from ${bareUrl(siteConfig.url)} on ${data.generatedOn}. ` +
      `PDF: ${siteConfig.url}/resume.pdf`,
  )
  return `${out.join("\n\n")}\n`
}
