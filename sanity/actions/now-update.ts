import { todayIso } from "../schemaTypes/nowType"

/** The published /now document, as much of it as starting a new update needs. */
export interface PublishedNow {
  _id: string
  _type: string
  _updatedAt?: string
  updatedOn?: string | null
  location?: string | null
  body?: unknown[] | null
  archive?: { _key: string; date?: string | null }[] | null
  [field: string]: unknown
}

/** Fields Sanity manages itself, never copied into a new draft. */
const SYSTEM = new Set(["_id", "_rev", "_createdAt", "_updatedAt"])

const randomKey = () => Math.random().toString(36).slice(2, 14)

/**
 * Why "Start a new update" can't run right now, or null when it can. A draft would be
 * overwritten, an unpublished page has nothing to archive, and an update written today would
 * only archive itself.
 */
export function newUpdateBlocker(
  published: PublishedNow | null,
  hasDraft: boolean,
  today: string,
): string | null {
  if (!published?.body?.length) return "Publish the first update before starting another."
  if (hasDraft) return "Publish or discard the current draft first."
  if (published.updatedOn === today) return "The published update is already dated today."
  return null
}

/**
 * The draft that starts a new update: the published update moved to the top of the archive
 * (dated by when it was written, or its last edit for older documents), and today's date. The
 * body and location stay as they were, so the new update starts from the old one: edit it,
 * then publish.
 */
export function buildNewUpdateDraft(
  published: PublishedNow,
  today: string = todayIso(),
  key: () => string = randomKey,
): Record<string, unknown> {
  const fields = Object.fromEntries(Object.entries(published).filter(([k]) => !SYSTEM.has(k)))
  const date = published.updatedOn ?? published._updatedAt?.slice(0, 10) ?? today
  const entry = {
    _key: key(),
    _type: "nowEntry",
    date,
    ...(published.location ? { location: published.location } : {}),
    body: published.body ?? [],
  }
  return {
    ...fields,
    _id: `drafts.${published._id}`,
    _type: published._type,
    updatedOn: today,
    archive: [entry, ...(published.archive ?? [])],
  }
}
