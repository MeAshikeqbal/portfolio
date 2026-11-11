import { siteConfig } from "../../lib/site"
import { isStale } from "../../lib/staleness"
import { DORMANT_AFTER_DAYS, projectStatus, type Status } from "../../lib/status"

/**
 * Pure rules behind the Studio's document badges, shared with the site so the CMS and the page
 * always agree (kept free of React/Sanity so they can be unit-tested). Labels are lowercase
 * words, as on the site's status pills; idle states get no colour.
 */

export type BadgeColor = "primary" | "success" | "warning" | "danger"
export interface Badge {
  label: string
  title: string
  color?: BadgeColor
}

/** Site status → Sanity badge colour (themed onto the status tokens). Idle stays grey. */
export const BADGE_COLOR: Record<Status, BadgeColor | undefined> = {
  up: "success",
  warn: "warning",
  down: "danger",
  info: "primary",
  idle: undefined,
}

interface ProjectDoc {
  status?: string | null
  githubData?: { pushedAt?: string | null } | null
}

/** The project's status exactly as the site shows it (dormant after 180 days without a push). */
export function projectBadge(doc: ProjectDoc | null | undefined, now: Date): Badge | null {
  const result = doc ? projectStatus(doc, now) : null
  if (!result) return null
  return {
    label: result.label,
    color: BADGE_COLOR[result.status],
    title:
      result.label === "dormant" && doc?.status !== "archived"
        ? `The site shows "dormant": no push to GitHub for ${DORMANT_AFTER_DAYS} days, whatever the status says`
        : `The site shows this project as "${result.label}"`,
  }
}

interface PostDoc {
  featured?: boolean | null
  archived?: boolean | null
}

/** Archived wins over pinned: an archived post leaves the log even when it's featured. */
export function postBadge(doc: PostDoc | null | undefined): Badge | null {
  if (doc?.archived) {
    return {
      label: "archived",
      title: "Out of the writing index, feeds and search; the page stays up (noindex)",
    }
  }
  if (doc?.featured) {
    return { label: "pinned", title: "Pinned to the top of the home page's writing log" }
  }
  return null
}

interface NowDoc {
  updatedOn?: string | null
  _updatedAt?: string | null
}

/** "stale" once the update is older than the site's limit, by the date it was written. */
export function nowBadge(doc: NowDoc | null | undefined, now: Date): Badge | null {
  const updated = doc?.updatedOn ?? doc?._updatedAt
  if (!isStale(updated, now, siteConfig.nowStaleAfterDays)) return null
  return {
    label: "stale",
    color: "warning",
    title: `The site marks /now stale after ${siteConfig.nowStaleAfterDays} days: time for a new update`,
  }
}

interface MessageDoc {
  status?: string | null
}

export function messageBadge(doc: MessageDoc | null | undefined): Badge | null {
  switch (doc?.status) {
    case "unread":
      return { label: "unread", color: "primary", title: "Not read yet" }
    case "archived":
      return { label: "archived", title: "Archived" }
    default:
      return null
  }
}
