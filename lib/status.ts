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
