import "server-only"

import type { Locale } from "@/i18n/locales"
import { postToMarkdown, signatureFor } from "@/lib/post-markdown"
import { resumeMarkdown, type ResumeContent } from "@/lib/resume"
import { siteConfig } from "@/lib/site"
import { dataset, projectId } from "@/sanity/env"
import { sanityFetch } from "@/sanity/lib/live"
import {
  COMMAND_INDEX_QUERY,
  CV_URL_QUERY,
  EDUCATION_QUERY,
  EXPERIENCES_QUERY,
  HOME_STATS_QUERY,
  HOMECAVE_RECORD_QUERY,
  NOW_QUERY,
  LATEST_POSTS_QUERY,
  POST_QUERY,
  POST_SLUGS_QUERY,
  POST_SOURCE_QUERY,
  POST_SOURCES_QUERY,
  POSTS_QUERY,
  PROJECT_QUERY,
  PROJECT_SLUGS_QUERY,
  PROJECTS_QUERY,
  SITE_STATUS_QUERY,
  SKILLS_QUERY,
  USES_QUERY,
} from "@/sanity/lib/queries"
import type {
  EDUCATION_QUERY_RESULT,
  EXPERIENCES_QUERY_RESULT,
  POST_QUERY_RESULT,
  POSTS_QUERY_RESULT,
  PROJECT_QUERY_RESULT,
  PROJECTS_QUERY_RESULT,
  SKILLS_QUERY_RESULT,
  COMMAND_INDEX_QUERY_RESULT,
  SITE_STATUS_QUERY_RESULT,
} from "@/sanity.types"

/**
 * Server-side data access. Every read goes through `sanityFetch`, so results are
 * cached and revalidated by `<SanityLive />` when content is published.
 * `stega: false` keeps strings clean until visual editing is enabled.
 *
 * Content reads take the page's locale: translatable fields come from the document's machine
 * translation when there is one (see sanity/lib/queries.ts), English otherwise. Pages get it
 * from `currentLocale()`; route handlers and image routes from their params.
 */

export type PostCard = POSTS_QUERY_RESULT[number]
export type Post = NonNullable<POST_QUERY_RESULT>
export type Project = PROJECTS_QUERY_RESULT[number]
export type ProjectDetail = NonNullable<PROJECT_QUERY_RESULT>
export type Skill = SKILLS_QUERY_RESULT[number]
export type Education = EDUCATION_QUERY_RESULT[number]
export type Experience = EXPERIENCES_QUERY_RESULT[number]

export async function getPosts(lang: Locale) {
  const { data } = await sanityFetch({ query: POSTS_QUERY, params: { lang }, stega: false })
  return data
}

export async function getLatestPosts(lang: Locale) {
  const { data } = await sanityFetch({ query: LATEST_POSTS_QUERY, params: { lang }, stega: false })
  return data
}

export async function getPost(slug: string, lang: Locale) {
  const { data } = await sanityFetch({
    query: POST_QUERY,
    params: { slug, lang },
    stega: false,
  })
  return data
}

/** A post's English original as Markdown, and the matching signature from `npm run sign`. */
export interface PostSourceFile {
  markdown: string
  /** Only while it covers this exact Markdown, and was made by the site's key. */
  signature: { armored: string; signedAt: string | null } | null
}

/**
 * The English original of a post as Markdown (/post/<slug>.md), whatever the page's language,
 * with its detached signature (/post/<slug>.md.asc) when one covers these exact bytes.
 */
export async function getPostSource(slug: string): Promise<PostSourceFile | null> {
  const { data } = await sanityFetch({ query: POST_SOURCE_QUERY, params: { slug }, stega: false })
  if (!data) return null
  const markdown = postToMarkdown(data, { projectId, dataset })
  return { markdown, signature: signatureFor(markdown, data.signature, siteConfig.pgpFingerprint) }
}

/** Every listed post's English original as Markdown, newest first (/llms-full.txt). */
export async function getPostSources(): Promise<string[]> {
  const { data } = await sanityFetch({ query: POST_SOURCES_QUERY, stega: false })
  return data.map((post) => postToMarkdown(post, { projectId, dataset }))
}

/**
 * Build-time reads for `generateStaticParams`, which runs without a request. With a server
 * token configured, `sanityFetch` would call `draftMode()` to pick a perspective, which Next
 * rejects there. Pinning the published perspective (and stega off) skips that lookup, and
 * static params should only ever list published documents anyway.
 */
const STATIC_PARAMS = { perspective: "published", stega: false } as const

/** Slugs for `generateStaticParams`. */
export async function getPostSlugs() {
  const { data } = await sanityFetch({ query: POST_SLUGS_QUERY, ...STATIC_PARAMS })
  return data.filter((slug): slug is string => Boolean(slug))
}

/** Read-only: GitHub stats are written by the `/api/sync-github-data` cron, never during render. */
export async function getProjects(lang: Locale) {
  const { data } = await sanityFetch({ query: PROJECTS_QUERY, params: { lang }, stega: false })
  return data
}

export async function getSkills() {
  const { data } = await sanityFetch({ query: SKILLS_QUERY, stega: false })
  return data
}

export async function getEducation(lang: Locale) {
  const { data } = await sanityFetch({ query: EDUCATION_QUERY, params: { lang }, stega: false })
  return data
}

export async function getExperiences(lang: Locale) {
  const { data } = await sanityFetch({ query: EXPERIENCES_QUERY, params: { lang }, stega: false })
  return data
}

export async function getCvUrl() {
  const { data } = await sanityFetch({ query: CV_URL_QUERY, stega: false })
  return data
}

export async function getProject(slug: string, lang: Locale) {
  const { data } = await sanityFetch({
    query: PROJECT_QUERY,
    params: { slug, lang },
    stega: false,
  })
  return data
}

export async function getProjectSlugs() {
  const { data } = await sanityFetch({ query: PROJECT_SLUGS_QUERY, ...STATIC_PARAMS })
  return data.filter((slug): slug is string => Boolean(slug))
}

export async function getHomeStats(lang: Locale) {
  const { data } = await sanityFetch({ query: HOME_STATS_QUERY, params: { lang }, stega: false })
  return data
}

export type SiteStatus = SITE_STATUS_QUERY_RESULT

export async function getSiteStatus() {
  const { data } = await sanityFetch({ query: SITE_STATUS_QUERY, stega: false })
  return data
}

export type CommandIndex = COMMAND_INDEX_QUERY_RESULT

export async function getCommandIndex(lang: Locale) {
  const { data } = await sanityFetch({ query: COMMAND_INDEX_QUERY, params: { lang }, stega: false })
  return data
}

export async function getUses(lang: Locale) {
  const { data } = await sanityFetch({ query: USES_QUERY, params: { lang }, stega: false })
  return data
}

export async function getHomecaveRecord(lang: Locale) {
  const { data } = await sanityFetch({
    query: HOMECAVE_RECORD_QUERY,
    params: { lang },
    stega: false,
  })
  return data
}

export async function getNow(lang: Locale) {
  const { data } = await sanityFetch({ query: NOW_QUERY, params: { lang }, stega: false })
  return data
}

/** What the generated résumé is built from (English). */
export async function getResumeContent(): Promise<ResumeContent> {
  const [experiences, education, skills, projects, posts] = await Promise.all([
    getExperiences("en"),
    getEducation("en"),
    getSkills(),
    getProjects("en"),
    getPosts("en"),
  ])
  return { experiences, education, skills, projects, posts }
}

/** The résumé as Markdown, from experience, education, skills, projects and posts. */
export async function getResumeMarkdown(): Promise<string> {
  return resumeMarkdown(await getResumeContent(), new Date())
}
