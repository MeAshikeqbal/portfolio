import "server-only"

import { sanityFetch } from "@/sanity/lib/live"
import {
  COMMAND_INDEX_QUERY,
  CV_URL_QUERY,
  EDUCATION_QUERY,
  EXPERIENCES_QUERY,
  HOME_STATS_QUERY,
  NOW_QUERY,
  LATEST_POSTS_QUERY,
  POST_QUERY,
  POST_SLUGS_QUERY,
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
 */

export type PostCard = POSTS_QUERY_RESULT[number]
export type Post = NonNullable<POST_QUERY_RESULT>
export type Project = PROJECTS_QUERY_RESULT[number]
export type ProjectDetail = NonNullable<PROJECT_QUERY_RESULT>
export type Skill = SKILLS_QUERY_RESULT[number]
export type Education = EDUCATION_QUERY_RESULT[number]
export type Experience = EXPERIENCES_QUERY_RESULT[number]

export async function getPosts() {
  const { data } = await sanityFetch({ query: POSTS_QUERY, stega: false })
  return data
}

export async function getLatestPosts() {
  const { data } = await sanityFetch({ query: LATEST_POSTS_QUERY, stega: false })
  return data
}

export async function getPost(slug: string) {
  const { data } = await sanityFetch({ query: POST_QUERY, params: { slug }, stega: false })
  return data
}

/** Slugs for `generateStaticParams`. */
export async function getPostSlugs() {
  const { data } = await sanityFetch({ query: POST_SLUGS_QUERY, stega: false })
  return data.filter((slug): slug is string => Boolean(slug))
}

/** Read-only: GitHub stats are written by the `/api/sync-github-data` cron, never during render. */
export async function getProjects() {
  const { data } = await sanityFetch({ query: PROJECTS_QUERY, stega: false })
  return data
}

export async function getSkills() {
  const { data } = await sanityFetch({ query: SKILLS_QUERY, stega: false })
  return data
}

export async function getEducation() {
  const { data } = await sanityFetch({ query: EDUCATION_QUERY, stega: false })
  return data
}

export async function getExperiences() {
  const { data } = await sanityFetch({ query: EXPERIENCES_QUERY, stega: false })
  return data
}

export async function getCvUrl() {
  const { data } = await sanityFetch({ query: CV_URL_QUERY, stega: false })
  return data
}

export async function getProject(slug: string) {
  const { data } = await sanityFetch({ query: PROJECT_QUERY, params: { slug }, stega: false })
  return data
}

export async function getProjectSlugs() {
  const { data } = await sanityFetch({ query: PROJECT_SLUGS_QUERY, stega: false })
  return data.filter((slug): slug is string => Boolean(slug))
}

export async function getHomeStats() {
  const { data } = await sanityFetch({ query: HOME_STATS_QUERY, stega: false })
  return data
}

export type SiteStatus = SITE_STATUS_QUERY_RESULT

export async function getSiteStatus() {
  const { data } = await sanityFetch({ query: SITE_STATUS_QUERY, stega: false })
  return data
}

export type CommandIndex = COMMAND_INDEX_QUERY_RESULT

export async function getCommandIndex() {
  const { data } = await sanityFetch({ query: COMMAND_INDEX_QUERY, stega: false })
  return data
}

export async function getUses() {
  const { data } = await sanityFetch({ query: USES_QUERY, stega: false })
  return data
}

export async function getNow() {
  const { data } = await sanityFetch({ query: NOW_QUERY, stega: false })
  return data
}
