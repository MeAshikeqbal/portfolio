import "server-only"

import type { Env, Fetch } from "@/lib/live/http"
import { formatDuration } from "@/lib/format"
import { absoluteUrl } from "@/lib/site"
import { isBadState, parseEntityId, type LabEvent } from "./incidents"

/**
 * Private push alerts for the owner, through ntfy (ntfy.sh with a secret topic, or a
 * self-hosted server): one per transition the heartbeat logs. Nothing here is shown on the site.
 *
 * Env: NTFY_TOPIC (required to send), NTFY_URL (default https://ntfy.sh), NTFY_TOKEN (optional,
 * for a protected topic).
 */

export interface Alert {
  title: string
  message: string
  /** ntfy priority: 4 (high) when something broke, 3 when it recovered. */
  priority: 3 | 4
  tags: string[]
}

const label = (e: LabEvent) => {
  const entity = parseEntityId(e.id)
  if (!entity) return null
  return {
    ...entity,
    what:
      entity.kind === "pool"
        ? `${entity.name} on ${entity.node}`
        : entity.kind === "backup"
          ? "Backups"
          : entity.name,
  }
}

/** Plain English words for one logged transition; null for anything not worth a push. */
export function alertFor(e: LabEvent): Alert | null {
  const entity = label(e)
  if (!entity) return null
  const { kind, what } = entity
  if (e.to === "nodata") {
    return {
      title: `${what} was silent for ${formatDuration(e.d)}`,
      message: `No heartbeat from ${what} for ${formatDuration(e.d)}; it's reporting again.`,
      priority: 3,
      tags: ["grey_question"],
    }
  }
  const wasBad = isBadState(kind, e.from)
  const isBad = isBadState(kind, e.to)
  if (!isBad && wasBad) {
    return {
      title: `${what} recovered`,
      message: `${what} is ${e.to} again after ${formatDuration(e.d)} ${e.from}.`,
      priority: 3,
      tags: ["white_check_mark"],
    }
  }
  if (!isBad) return null
  const state = kind === "backup" ? `backup round ${e.to}` : e.to
  return {
    title: `${what}: ${state}`,
    message:
      kind === "pool"
        ? `ZFS pool ${what} reports ${e.to} (was ${e.from}).`
        : `${what} is ${state} (was ${e.from}).`,
    priority: 4,
    tags: ["rotating_light"],
  }
}

/** Sends one push per alert-worthy event. Never throws: an alert must not fail a heartbeat. */
export async function sendAlerts(
  events: LabEvent[],
  env: Env = process.env,
  fetchImpl: Fetch = fetch,
): Promise<number> {
  if (!env.NTFY_TOPIC || events.length === 0) return 0
  const alerts = events.map(alertFor).filter((a): a is Alert => a !== null)
  let sent = 0
  for (const alert of alerts) {
    if (await sendPush({ ...alert, click: absoluteUrl("/homecave") }, env, fetchImpl)) sent += 1
  }
  return sent
}

/** One push to the owner's ntfy topic; false when unconfigured or it didn't go. Never throws. */
export async function sendPush(
  push: Alert & { click: string },
  env: Env = process.env,
  fetchImpl: Fetch = fetch,
): Promise<boolean> {
  const topic = env.NTFY_TOPIC
  if (!topic) return false
  const base = (env.NTFY_URL || "https://ntfy.sh").replace(/\/+$/, "")
  try {
    // JSON publishing: titles with any characters, no header encoding.
    const response = await fetchImpl(base, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(env.NTFY_TOKEN && { authorization: `Bearer ${env.NTFY_TOKEN}` }),
      },
      body: JSON.stringify({ topic, ...push }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })
    return response.ok
  } catch {
    // Best effort: whatever it's about is recorded either way.
    return false
  }
}
