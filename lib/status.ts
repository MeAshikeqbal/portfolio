/**
 * The status vocabulary. Colour is reserved for these meanings and nothing else:
 * up = live/active · warn = needs attention · down = error · info = link/informational · idle = inactive
 */
export type Status = "up" | "warn" | "down" | "info" | "idle"

export const STATUSES: readonly Status[] = ["up", "warn", "down", "info", "idle"]

/** Full class names (not built dynamically) so Tailwind can detect them. */
export const STATUS_DOT_CLASS: Record<Status, string> = {
  up: "bg-status-up",
  warn: "bg-status-warn",
  down: "bg-status-down",
  info: "bg-status-info",
  idle: "bg-status-idle",
}

export const STATUS_PILL_CLASS: Record<Status, string> = {
  up: "bg-status-up-soft text-status-up-fg",
  warn: "bg-status-warn-soft text-status-warn-fg",
  down: "bg-status-down-soft text-status-down-fg",
  info: "bg-status-info-soft text-status-info-fg",
  idle: "bg-status-idle-soft text-status-idle-fg",
}

/** Status text on a plain surface (a visible label next to a dot). */
export const STATUS_TEXT_CLASS: Record<Status, string> = {
  up: "text-status-up-fg",
  warn: "text-status-warn-fg",
  down: "text-status-down-fg",
  info: "text-status-info-fg",
  idle: "text-status-idle-fg",
}

/** A project with no push for this long reads as dormant, whatever the CMS says. */
export const DORMANT_AFTER_DAYS = 180

/**
 * A project's display status. The CMS states intent ("active", "maintained", "archived"); the
 * GitHub sync measures activity, and the measurement wins: no push for DORMANT_AFTER_DAYS is
 * "dormant" even if the CMS still says active. Only measured-or-declared activity is green;
 * maintained, dormant and archived are all grey and told apart by their (always visible) label.
 * Returns null when the CMS sets no status, so nothing is claimed.
 */
export function projectStatus(
  project: { status?: string | null; githubData?: { pushedAt?: string | null } | null },
  now: Date = new Date(),
): { status: Status; label: string } | null {
  const value = project.status
  if (!value) return null
  if (value === "archived") return { status: "idle", label: "archived" }

  const pushedAt = project.githubData?.pushedAt ? new Date(project.githubData.pushedAt) : null
  const days =
    pushedAt && !Number.isNaN(pushedAt.getTime())
      ? (now.getTime() - pushedAt.getTime()) / 86_400_000
      : null
  if (days !== null && days > DORMANT_AFTER_DAYS) return { status: "idle", label: "dormant" }

  switch (value) {
    case "active":
      return { status: "up", label: "active" }
    case "maintained":
      return { status: "idle", label: "maintained" }
    default:
      return null
  }
}

/** How long the daily GitHub sync can go quiet before it counts as stale. */
export const SYNC_FRESH_HOURS = 36

/**
 * Health of the GitHub sync, judged from when it last wrote to a project.
 * Returns null when it has never run, so nothing is claimed.
 */
export function syncStatus(
  syncedAt: string | null | undefined,
  now: Date = new Date(),
): { status: Status; label: string } | null {
  if (!syncedAt) return null
  const ageHours = (now.getTime() - new Date(syncedAt).getTime()) / 3_600_000
  return ageHours <= SYNC_FRESH_HOURS
    ? { status: "up", label: "github sync ok" }
    : { status: "warn", label: "github sync stale" }
}
