import type { PostCard, Project } from "@/lib/api"
import { excerptLine } from "@/lib/plain-text"
import { byActivity } from "@/lib/projects"
import { siteConfig } from "@/lib/site"

/**
 * /llms.txt (llmstxt.org): what the site is and where its plain-text copies are, for language
 * models and other tools that read sites on someone's behalf. Posts link to their Markdown.
 */
export function llmsText({
  posts,
  projects,
  hasNow,
}: {
  posts: readonly PostCard[]
  projects: readonly Project[]
  hasNow: boolean
}): string {
  const url = (path: string) => `${siteConfig.url}${path}`
  const one = (text: string | null | undefined) => text?.replace(/\s+/g, " ").trim() ?? ""
  const sections = [
    `# ${siteConfig.name}`,
    `> ${siteConfig.description}`,
    [
      "Every post is also served as Markdown at /post/<slug>.md (the English original); a",
      "signed post has its detached PGP signature at /post/<slug>.md.asc. The homelab's live",
      "status is JSON at /api/lab-status, and command-line clients get plain text:",
      `curl ${new URL(siteConfig.url).hostname.replace(/^www\./, "")}`,
    ].join("\n"),
    [
      "## Posts",
      ...posts
        .filter((post) => post.slug)
        .map(
          (post) =>
            `- [${one(post.title)}](${url(`/post/${post.slug}.md`)})${post.excerpt ? `: ${excerptLine(post.excerpt)}` : ""}`,
        ),
    ].join("\n"),
    [
      "## Projects",
      ...byActivity([...projects])
        .filter((project) => project.slug)
        .map(
          (project) =>
            `- [${one(project.title)}](${url(`/projects/${project.slug}`)})${project.description ? `: ${one(project.description)}` : ""}`,
        ),
    ].join("\n"),
    [
      "## About",
      `- [Résumé](${url("/resume.md")}): experience, education, projects and skills, generated from this site`,
      `- [Homecave](${url("/homecave")}): the homelab, live (JSON: ${url("/api/lab-status")})`,
      ...(hasNow ? [`- [Now](${url("/now")}): what I'm focused on at the moment`] : []),
    ].join("\n"),
    [
      "## Optional",
      `- [Every post in full](${url("/llms-full.txt")}): all the Markdown above in one file`,
      `- [RSS](${url("/rss.xml")}): full-text feed`,
      `- [PGP key](${url("/pgp.asc")}): signs the posts, security.txt and the footer statement`,
    ].join("\n"),
  ]
  return `${sections.join("\n\n")}\n`
}
