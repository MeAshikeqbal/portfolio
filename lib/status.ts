/**
 * The status vocabulary. Colour is reserved for these meanings and nothing else:
 * up = live/healthy · warn = needs attention · down = error · info = informational · idle = inactive
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

/** Maps a project's CMS `status` to a display status. Returns null when unset, so nothing is claimed. */
export function projectStatus(
  value: string | null | undefined,
): { status: Status; label: string } | null {
  switch (value) {
    case "active":
      return { status: "up", label: "live" }
    case "maintained":
      return { status: "info", label: "maintained" }
    case "archived":
      return { status: "idle", label: "archived" }
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
