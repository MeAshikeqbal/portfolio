import { defineQuery } from "next-sanity"

/**
 * All GROQ queries live here. `npm run typegen` turns each `defineQuery` into a
 * typed result in `sanity.types.ts`, which `sanityFetch` picks up automatically.
 */

const published = `!(_id in path("drafts.**"))`

/** First 200 characters of the post body as plain text, unless an explicit excerpt is set. */
// Paragraphs only, so headings like "Introduction" don't lead the excerpt.
const excerpt = `coalesce(excerpt, array::join(string::split(pt::text(body[_type == "block" && style == "normal"]), "")[0...200], ""))`

const postCard = `
  _id,
  title,
  "slug": slug.current,
  mainImage,
  "lqip": mainImage.asset->metadata.lqip,
  publishedAt,
  "excerpt": ${excerpt},
  categories[]->{ _id, title },
  author->{ name }
`

export const POSTS_QUERY = defineQuery(`
  *[_type == "post" && ${published} && defined(slug.current)] | order(publishedAt desc) { ${postCard} }
`)

/** Home page writing: featured posts first, then the newest, three in all. */
export const LATEST_POSTS_QUERY = defineQuery(`
  *[_type == "post" && ${published} && defined(slug.current)]
    | order(coalesce(featured, false) desc, publishedAt desc) [0...3] { ${postCard} }
`)

const indexablePost = `_type == "post" && ${published} && defined(slug.current)`

export const POST_QUERY = defineQuery(`
  *[_type == "post" && ${published} && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    author->{ name, image },
    mainImage,
    "cover": mainImage.asset->metadata{ lqip, "width": dimensions.width, "height": dimensions.height },
    categories[]->{ _id, title },
    publishedAt,
    _updatedAt,
    body,
    excerpt,
    seo,
    "previous": *[${indexablePost} && publishedAt < ^.publishedAt]
      | order(publishedAt desc)[0] { title, "slug": slug.current },
    "next": *[${indexablePost} && publishedAt > ^.publishedAt]
      | order(publishedAt asc)[0] { title, "slug": slug.current },
    "related": *[${indexablePost} && _id != ^._id && count(categories[@._ref in ^.^.categories[]._ref]) > 0]
      | order(publishedAt desc)[0...3] { ${postCard} }
  }
`)

export const POST_SLUGS_QUERY = defineQuery(`
  *[_type == "post" && ${published} && defined(slug.current)].slug.current
`)

const projectFields = `
  _id,
  title,
  "slug": slug.current,
  description,
  mainImage,
  publishedAt,
  github,
  url,
  featured,
  status,
  tech,
  githubData
`

export const PROJECTS_QUERY = defineQuery(`
  *[_type == "project" && ${published}] | order(orderRank asc, _createdAt desc) { ${projectFields} }
`)

export const PROJECT_QUERY = defineQuery(`
  *[_type == "project" && ${published} && slug.current == $slug][0] { ${projectFields}, body, seo }
`)

export const PROJECT_SLUGS_QUERY = defineQuery(`
  *[_type == "project" && ${published} && defined(slug.current)].slug.current
`)

/** Facts for the hero's node panel. Every value is measured or written in the CMS. */
export const HOME_STATS_QUERY = defineQuery(`{
  "posts": count(*[_type == "post" && ${published} && defined(slug.current)]),
  "projects": count(*[_type == "project" && ${published}]),
  // Past-52-week commits per repo, summed (see lib/fetch-github-data.ts).
  "commits": math::sum(*[_type == "project" && ${published}].githubData.commits),
  "latestPost": *[_type == "post" && ${published} && defined(slug.current)]
    | order(publishedAt desc)[0] { title, "slug": slug.current, publishedAt },
  // The "Homelab" section of /uses, if there is one.
  "homelab": *[_type == "uses" && _id == "uses"][0]
    .sections[string::startsWith(lower(title), "homelab")][0]
    .items[0...5] { _key, name, description, url, icon }
}`)

/**
 * Real signals for the system bar: when the GitHub sync last wrote to a project, and the
 * newest post. Both are null until they exist; nothing is assumed.
 */
export const SITE_STATUS_QUERY = defineQuery(`{
  "syncedAt": *[_type == "project" && ${published} && defined(githubData.syncedAt)]
    | order(githubData.syncedAt desc)[0].githubData.syncedAt,
  "latestPostAt": *[_type == "post" && ${published} && defined(slug.current)]
    | order(publishedAt desc)[0].publishedAt
}`)

export const SKILLS_QUERY = defineQuery(`
  *[_type == "skills"] | order(orderRank asc, name asc) { _id, name, icon, category }
`)

export const EDUCATION_QUERY = defineQuery(`
  *[_type == "education"] | order(year desc) { _id, year, degree, school, schoolLogo, desc }
`)

export const EXPERIENCES_QUERY = defineQuery(`
  *[_type == "experiences"] | order(year desc) {
    _id,
    year,
    works[]{ _key, name, company, copmanyLogo, desc }
  }
`)

export const CV_URL_QUERY = defineQuery(`
  *[_type == "cv"][0].cvFile.asset->url
`)

export const FEED_POSTS_QUERY = defineQuery(`
  *[_type == "post" && ${published} && defined(slug.current)] | order(publishedAt desc) {
    title,
    "slug": slug.current,
    publishedAt,
    _updatedAt,
    "excerpt": ${excerpt},
    author->{ name },
    "categories": categories[]->title,
    "image": mainImage.asset->{ url, "mimeType": mimeType }
  }
`)

/** Includes drafts on purpose: the GitHub sync updates every project with a repo. */
export const GITHUB_PROJECTS_QUERY = defineQuery(`
  *[_type == "project" && defined(github)] { _id, title, github }
`)

/** Projects named in a Studio "Sync from GitHub" request (see lib/github-sync-request.ts). */
export const GITHUB_SYNC_REQUESTS_QUERY = defineQuery(`
  *[_type == "project" && _id in $ids] { _id, title, github, githubSyncRequestedAt }
`)

/** Indexable posts and projects for the sitemap (documents marked `seo.noIndex` are left out). */
export const SITEMAP_QUERY = defineQuery(`{
  "posts": *[_type == "post" && ${published} && defined(slug.current) && seo.noIndex != true]
    | order(publishedAt desc) { "slug": slug.current, _updatedAt },
  "projects": *[_type == "project" && ${published} && defined(slug.current) && seo.noIndex != true]
    { "slug": slug.current, _updatedAt },
  "uses": *[_type == "uses" && _id == "uses" && count(sections[count(items) > 0]) > 0][0]._updatedAt,
  "now": *[_type == "now" && _id == "now" && count(body) > 0][0]._updatedAt
}`)

/** Small index of everything navigable, for the ⌘K command palette. */
export const COMMAND_INDEX_QUERY = defineQuery(`{
  "posts": *[_type == "post" && ${published} && defined(slug.current)] | order(publishedAt desc) {
    _id, title, "slug": slug.current, "topics": categories[]->title
  },
  "projects": *[_type == "project" && ${published}] | order(orderRank asc, _createdAt desc) {
    _id, title, "slug": slug.current, url, github
  },
  // Only whether a CV exists: the file itself is served from /resume.pdf.
  "hasCv": defined(*[_type == "cv"][0].cvFile.asset),
  // /uses and /now are only linked once they have published content.
  // Same rule as the /uses page: at least one section with items.
  "hasUses": count(*[_type == "uses" && _id == "uses"][0].sections[count(items) > 0]) > 0,
  "hasNow": count(*[_type == "now" && _id == "now"][0].body) > 0
}`)

export const USES_QUERY = defineQuery(`
  *[_type == "uses" && _id == "uses"][0] {
    _updatedAt,
    intro,
    sections[]{ _key, title, items[]{ _key, name, description, url, icon } }
  }
`)

export const NOW_QUERY = defineQuery(`
  *[_type == "now" && _id == "now"][0] { _updatedAt, location, body }
`)
