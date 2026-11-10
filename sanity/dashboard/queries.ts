/**
 * GROQ for the Studio dashboard. Run with the raw perspective (drafts and published copies
 * both visible), so "published" filters exclude `drafts.` and `versions.` ids explicitly.
 */

const PUBLISHED = `!(_id in path("drafts.**")) && !(_id in path("versions.**"))`

export const OVERVIEW_QUERY = `{
  "posts": count(*[_type == "post" && ${PUBLISHED}]),
  "projects": count(*[_type == "project" && ${PUBLISHED}]),
  "skills": count(*[_type == "skills" && ${PUBLISHED}]),
  "drafts": count(*[_id in path("drafts.**")]),
  "postDates": *[_type == "post" && ${PUBLISHED} && defined(publishedAt)].publishedAt
}`

export interface OverviewResult {
  posts: number
  projects: number
  skills: number
  drafts: number
  /** Publish dates of published posts, for the cadence sparkline. */
  postDates: string[]
}

/** Runs against the private inbox dataset. */
export const INBOX_QUERY = `{
  "unread": count(*[_type == "message" && status == "unread" && ${PUBLISHED}]),
  "latest": *[_type == "message" && status != "archived" && ${PUBLISHED}]
    | order(receivedAt desc)[0...5]{ _id, name, status, receivedAt, message }
}`

export interface InboxResult {
  unread: number
  latest: {
    _id: string
    name: string | null
    status: string | null
    receivedAt: string
    message: string | null
  }[]
}

export const RECENT_QUERY = `*[_type in $types && !(_id in path("versions.**"))]
  | order(_updatedAt desc)[0...24]{
    _id, _type, _updatedAt,
    "title": coalesce(title, name, degree, year, select(_type == "cv" => "Résumé"))
  }`

export const HEALTH_QUERY = `{
  "postsNoExcerpt": *[_type == "post" && ${PUBLISHED} && (!defined(excerpt) || excerpt == "")]{ _id, _type, title },
  "imagesNoAlt": *[_type in ["post", "project"] && ${PUBLISHED} && defined(mainImage.asset) && (!defined(mainImage.alt) || mainImage.alt == "")]{ _id, _type, title },
  "projectsIncomplete": *[_type == "project" && ${PUBLISHED} && (!defined(status) || !defined(tech) || count(tech) == 0)]{ _id, _type, title },
  "skillsNoIcon": *[_type == "skills" && ${PUBLISHED} && (!defined(icon) || icon == "")]{ _id, _type, "title": name },
  "skillIcons": *[_type == "skills" && ${PUBLISHED} && defined(icon) && icon != ""]{ _id, _type, "title": name, icon }
}`

/**
 * When the published /now update was written (its last edit until `updatedOn` is set, as on the
 * site); null while it's unpublished or has no body.
 */
const PUBLISHED_NOW = `*[_type == "now" && _id == "now" && count(body) > 0][0]`
export const NOW_FRESHNESS_QUERY = `coalesce(${PUBLISHED_NOW}.updatedOn, ${PUBLISHED_NOW}._updatedAt)`

/** Both versions of each project with a repo, so "Sync all" refreshes drafts too. */
export const GITHUB_QUERY = `*[_type == "project" && defined(github) && !(_id in path("versions.**"))]
  | order(lower(title) asc){ _id, title, "syncedAt": githubData.syncedAt, "language": githubData.language }`

export interface GitHubRow {
  _id: string
  title: string | null
  syncedAt: string | null
  language: string | null
}
