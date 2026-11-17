import { getTranslations } from "next-intl/server"
import { homelabSpecs } from "@/components/about/uses-view"
import {
  getLatestPosts,
  getNow,
  getPosts,
  getPostSource,
  getProject,
  getProjects,
  getResumeMarkdown,
  getUses,
} from "@/lib/api"
import { readLabReliability, readLabStatus } from "@/lib/lab/store"
import { toPublicStatus } from "@/lib/lab/public"
import { byActivity } from "@/lib/projects"
import { bodyToMarkdown } from "@/lib/post-markdown"
import {
  at,
  commands,
  header,
  homecaveText,
  labLines,
  links,
  page,
  postList,
  projectList,
  rule,
  wrap,
  wrapMarkdown,
} from "@/lib/plain-text"
import { siteConfig } from "@/lib/site"
import { dataset, projectId } from "@/sanity/env"

/**
 * The site as plain text for command-line clients: proxy.ts rewrites `curl`, `wget`, HTTPie
 * and xh requests for /, /post, /post/<slug>, /projects, /projects/<slug>, /homecave, /now and
 * /resume here (lib/plain-text.ts). Browsers never see it. English, like the Markdown copies.
 */
export const revalidate = 30

type Params = { params: Promise<{ path?: string[] }> }

const text = (body: string, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } })

const notFound = () => text(page("Not found.", `Try: curl -sL ${at("/")}`), 404)

async function lab() {
  const [status, uses] = await Promise.all([
    readLabStatus(process.env, fetch, { revalidate: 30 }),
    getUses("en"),
  ])
  return {
    status: status ? toPublicStatus(status) : null,
    order: homelabSpecs(uses).map((spec) => spec.name),
  }
}

export async function GET(_request: Request, { params }: Params) {
  const [section, slug, ...rest] = (await params).path ?? []
  if (rest.length > 0) return notFound()
  const now = new Date()

  if (!section) {
    const [posts, projects, { status, order }] = await Promise.all([
      getLatestPosts("en"),
      getProjects("en"),
      lab(),
    ])
    return text(
      page(
        header(),
        links(),
        rule("writing", "latest"),
        postList(posts.slice(0, 4)),
        rule("projects", "most active"),
        projectList(
          byActivity(projects)
            .filter((p) => p.status !== "archived")
            .slice(0, 5),
        ),
        rule("homelab"),
        labLines(status, now, order),
        rule("more"),
        commands(),
      ),
    )
  }

  if (section === "post" && !slug) {
    const posts = await getPosts("en")
    return text(
      page(header(), rule("writing", `${posts.length} posts`), postList(posts, { excerpts: true })),
    )
  }
  if (section === "post") {
    const source = await getPostSource(slug)
    return source ? text(source.markdown) : notFound()
  }

  if (section === "projects" && !slug) {
    const projects = byActivity(await getProjects("en"))
    return text(
      page(header(), rule("projects", `${projects.length} projects`), projectList(projects)),
    )
  }
  if (section === "projects") {
    const project = await getProject(slug, "en")
    if (!project) return notFound()
    const facts = [
      project.status && `status   ${project.status}`,
      project.url && `site     ${project.url}`,
      project.github && `source   ${project.github}`,
      project.tech?.length && `tech     ${project.tech.join(", ")}`,
    ].filter(Boolean)
    return text(
      page(
        `${(project.title ?? slug).toUpperCase()}`,
        project.description && wrap(project.description),
        facts.join("\n"),
        project.body?.length
          ? wrapMarkdown(bodyToMarkdown(project.body, { projectId, dataset }))
          : null,
        `${siteConfig.url}/projects/${slug}`,
      ),
    )
  }

  if (section === "homecave" && !slug) {
    const [{ status, order }, record, t] = await Promise.all([
      lab(),
      readLabReliability(process.env, fetch, { revalidate: 60 }),
      getTranslations({ locale: "en", namespace: "homecave" }),
    ])
    return text(homecaveText(status, record, now, t, order))
  }

  if (section === "now" && !slug) {
    const current = await getNow("en")
    if (!current?.body?.length) return notFound()
    return text(
      page(
        `NOW · updated ${current.updated.slice(0, 10)}${current.location ? ` · ${current.location}` : ""}`,
        wrapMarkdown(bodyToMarkdown(current.body, { projectId, dataset })),
        `${siteConfig.url}/now`,
      ),
    )
  }

  if (section === "resume" && !slug) return text(await getResumeMarkdown())

  return notFound()
}
