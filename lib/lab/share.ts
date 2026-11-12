import type { Status } from "@/lib/status"
import { formatUptime, isNodeFresh, labSummary, lastReceived } from "./freshness"
import type { LabStatus } from "./types"

/**
 * What /homecave's share card says about the lab: the cluster verdict and a few counts, each
 * only when measured. Machine, service and storage names never appear: the card is a public
 * image that outlives the page, so it carries counts alone.
 */
export function labShareFacts(
  status: LabStatus | null | undefined,
  now: Date,
): { status: { status: Status; label: string }; footer: string[] } {
  const summary = labSummary(status, now)
  if (!status || !summary || summary.label === "no data") {
    return { status: { status: "idle", label: "no data" }, footer: [] }
  }

  const footer: string[] = []
  const fresh = status.nodes.filter((n) => isNodeFresh(n, now))

  // The shortest uptime among running machines: the cluster has been whole for that long.
  const up = fresh.filter((n) => n.online)
  if (up.length > 0) footer.push(`uptime ${formatUptime(Math.min(...up.map((n) => n.uptime)))}`)

  const [running, total] = fresh.reduce(
    (acc, n) => [acc[0] + (n.guests?.running ?? 0), acc[1] + (n.guests?.total ?? 0)],
    [0, 0],
  )
  if (total > 0) footer.push(`${running}/${total} guests`)

  const pools = fresh.flatMap((n) => (n.storage ?? []).filter((s) => s.kind === "pool" && s.health))
  if (pools.length > 0) {
    footer.push(`${pools.filter((p) => p.health === "ONLINE").length}/${pools.length} pools`)
  }

  const measured = lastReceived(status)
  if (measured) footer.push(`measured ${formatUtcStamp(measured)}`)

  return { status: summary, footer }
}

/** "Nov 13 14:05 UTC": a share card is seen in any timezone, possibly days after it was drawn. */
export function formatUtcStamp(iso: string): string {
  const date = new Date(iso)
  const day = date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })
  return `${day} ${time} UTC`
}
