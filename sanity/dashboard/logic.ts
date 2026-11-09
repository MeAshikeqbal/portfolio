/**
 * Pure helpers behind the Studio dashboard widgets (kept free of React/Sanity so they can be
 * unit-tested).
 */

/** Document types shown in "Recently edited", with the label used in the list. */
export const TYPE_LABELS: Record<string, string> = {
  post: "Post",
  project: "Project",
  skills: "Skill",
  category: "Category",
  author: "Author",
  experiences: "Experience",
  education: "Education",
  cv: "CV",
  uses: "Uses",
  now: "Now",
}

export const DRAFT_PREFIX = "drafts."

/** Published id for a document id that may be a draft (`drafts.abc` → `abc`). */
export function publishedId(id: string): string {
  return id.startsWith(DRAFT_PREFIX) ? id.slice(DRAFT_PREFIX.length) : id
}

export interface EditedDoc {
  _id: string
  _type: string
  _updatedAt: string
  title?: string | null
}

export interface RecentItem {
  id: string
  type: string
  title: string
  updatedAt: string
  /** True when the most recent change is an unpublished draft. */
  draft: boolean
}

/**
 * Collapses draft + published copies of the same document (input sorted newest first) into
 * one row per document, keeping the newest change.
 */
export function dedupeRecent(docs: EditedDoc[], limit = 8): RecentItem[] {
  const seen = new Set<string>()
  const items: RecentItem[] = []
  for (const doc of docs) {
    const id = publishedId(doc._id)
    if (seen.has(id)) continue
    seen.add(id)
    items.push({
      id,
      type: doc._type,
      title: doc.title?.trim() || "Untitled",
      updatedAt: doc._updatedAt,
      draft: doc._id.startsWith(DRAFT_PREFIX),
    })
    if (items.length === limit) break
  }
  return items
}

export interface HealthDoc {
  _id: string
  _type: string
  title?: string | null
}

export interface HealthData {
  postsNoExcerpt: HealthDoc[]
  imagesNoAlt: HealthDoc[]
  projectsIncomplete: HealthDoc[]
  skillsNoIcon: HealthDoc[]
}

export interface HealthIssue {
  id: string
  type: string
  title: string
  problem: string
}

/**
 * Flattens the health query (plus the skills whose icon doesn't resolve) into one list of
 * problems, one row per document and problem.
 */
export function healthIssues(
  data: HealthData,
  brokenIcons: (HealthDoc & { icon: string })[],
): HealthIssue[] {
  const row = (doc: HealthDoc, problem: string): HealthIssue => ({
    id: publishedId(doc._id),
    type: doc._type,
    title: doc.title?.trim() || "Untitled",
    problem,
  })
  return [
    ...brokenIcons.map((doc) => row(doc, `Icon “${doc.icon}” not found`)),
    ...data.skillsNoIcon.map((doc) => row(doc, "No icon")),
    ...data.imagesNoAlt.map((doc) => row(doc, "Cover image has no alt text")),
    ...data.postsNoExcerpt.map((doc) => row(doc, "No excerpt")),
    ...data.projectsIncomplete.map((doc) => row(doc, "Missing status or tech")),
  ]
}

/** "3h ago"-style relative time for compact lists. */
export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  const steps: [number, string][] = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [30, "d"],
    [12, "mo"],
  ]
  let value = seconds
  for (const [size, unit] of steps) {
    if (value < size) return `${value}${unit} ago`
    value = Math.floor(value / size)
  }
  return `${value}y ago`
}

/** Single-line preview of a message body. */
export function snippet(text: string | null | undefined, max = 80): string {
  const flat = (text ?? "").replace(/\s+/g, " ").trim()
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat
}

/** Whether a Studio user has the administrator role. */
export function isAdmin(user: { roles?: { name: string }[] } | null | undefined): boolean {
  return Boolean(user?.roles?.some((role) => role.name === "administrator"))
}

/** One row per project (the published copy wins over its draft), plus every id to sync. */
export function githubRows<T extends { _id: string }>(docs: T[]): { rows: T[]; ids: string[] } {
  const rows = new Map<string, T>()
  for (const doc of docs) {
    const id = publishedId(doc._id)
    if (!rows.has(id) || !doc._id.startsWith(DRAFT_PREFIX)) rows.set(id, doc)
  }
  return { rows: [...rows.values()], ids: docs.map((doc) => doc._id) }
}

/**
 * /now turns "stale" after this many days without an edit. Mirrors the site's
 * `siteConfig.nowStaleAfterDays` (PR #140); import it from there once both have merged.
 */
export const NOW_STALE_AFTER_DAYS = 90

export interface NowFreshness {
  state: "unpublished" | "fresh" | "stale"
  /** Whole days since the last published edit; null when unpublished. */
  days: number | null
  /** Short line for the dashboard row. */
  label: string
}

/** How current the published /now page is, from its `_updatedAt` (null when unpublished). */
export function nowFreshness(
  updatedAt: string | null | undefined,
  now = Date.now(),
  staleAfterDays = NOW_STALE_AFTER_DAYS,
): NowFreshness {
  const time = updatedAt ? new Date(updatedAt).getTime() : NaN
  if (Number.isNaN(time)) {
    return { state: "unpublished", days: null, label: "Not published: /now is a 404" }
  }
  const days = Math.max(0, Math.floor((now - time) / 86_400_000))
  const ago = days === 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`
  return days > staleAfterDays
    ? { state: "stale", days, label: `Updated ${ago}: time for a new update` }
    : { state: "fresh", days, label: `Updated ${ago}` }
}
