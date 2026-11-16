import type { Status } from "@/lib/status"
import { formatUptime, isNodeFresh, labSummary, lastReceived } from "./freshness"
import type { LabStatus } from "./types"

/** One counted fact for the share card's footer; the caller words it per locale (messages: og). */
export type ShareFact =
  | { kind: "uptime"; uptime: string }
  | { kind: "guests"; running: number; total: number }
  | { kind: "pools"; healthy: number; total: number }
  | { kind: "measured"; time: string }

/**
 * What /homecave's share card says about the lab: the cluster verdict and a few counts, each
 * only when measured. Machine, service and storage names never appear: the card is a public
 * image that outlives the page, so it carries counts alone. `up` is null when nothing's known.
 */
export function labShareFacts(
  status: LabStatus | null | undefined,
  now: Date,
  locale = "en",
): { status: Status; up: number | null; total: number; footer: ShareFact[] } {
  const summary = labSummary(status, now)
  if (!status || !summary || summary.up === null) {
    return { status: "idle", up: null, total: summary?.total ?? 0, footer: [] }
  }

  const footer: ShareFact[] = []
  const fresh = status.nodes.filter((n) => isNodeFresh(n, now))

  // The shortest uptime among running machines: the cluster has been whole for that long.
  const up = fresh.filter((n) => n.online)
  if (up.length > 0) {
    footer.push({ kind: "uptime", uptime: formatUptime(Math.min(...up.map((n) => n.uptime))) })
  }

  const [running, total] = fresh.reduce(
    (acc, n) => [acc[0] + (n.guests?.running ?? 0), acc[1] + (n.guests?.total ?? 0)],
    [0, 0],
  )
  if (total > 0) footer.push({ kind: "guests", running, total })

  const pools = fresh.flatMap((n) => (n.storage ?? []).filter((s) => s.kind === "pool" && s.health))
  if (pools.length > 0) {
    footer.push({
      kind: "pools",
      healthy: pools.filter((p) => p.health === "ONLINE").length,
      total: pools.length,
    })
  }

  const measured = lastReceived(status)
  if (measured) footer.push({ kind: "measured", time: formatUtcStamp(measured, locale) })

  return { status: summary.status, up: summary.up, total: summary.total, footer }
}

const pad = (n: number) => String(n).padStart(2, "0")

/** "Nov 13 14:05 UTC": a share card is seen in any timezone, possibly days after it was drawn. */
export function formatUtcStamp(iso: string, locale = "en"): string {
  const date = new Date(iso)
  // Day and month only: the year would crowd the footer.
  const day = new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date)
  return `${day} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`
}
