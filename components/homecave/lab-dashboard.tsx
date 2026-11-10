"use client"

import type { ReactNode } from "react"
import { DataList, DataRow } from "@/components/dashboard/data-list"
import { Meter } from "@/components/dashboard/meter"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { Sparkline } from "@/components/dashboard/sparkline"
import { StatusPill } from "@/components/dashboard/status-pill"
import { LabNodeBadgeView, LabSummaryView } from "@/components/lab/lab-badges"
import { useLabStatus } from "@/components/lab/use-lab-status"
import { formatBytes, formatPercent, formatRate, formatRelative } from "@/lib/format"
import { formatUptime, isNodeFresh, lastReceived, nodeState } from "@/lib/lab/freshness"
import type { LabNodeStatus, LabStatus, LabStorage } from "@/lib/lab/types"
import type { Status } from "@/lib/status"
import { cn } from "@/lib/utils"

/** A Homecave "Homelab" row from the Studio: its description is the node's spec line. */
export interface NodeSpec {
  name: string
  description: string | null
}

const HEALTH: Record<string, { status: Status; label: string }> = {
  ONLINE: { status: "up", label: "healthy" },
  DEGRADED: { status: "warn", label: "degraded" },
}

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
})

/** Values only, gaps dropped: the sparkline draws what was measured. */
const series = (values: (number | null)[] | undefined) =>
  (values ?? []).filter((v): v is number => typeof v === "number")

/** "641 KB/s" → the number at full size, the unit small, so values never wrap in a tile. */
function WithUnit({ text }: { text: string }) {
  const match = /^([\d.,]+)\s*(.+)$/.exec(text)
  if (!match) return <>{text}</>
  return (
    <>
      {match[1]}
      <span className="ml-0.5 text-xs font-normal text-muted-foreground">{match[2]}</span>
    </>
  )
}

function Metric({
  label,
  value,
  hint,
  trend,
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  trend?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 px-4 py-3", className)}>
      <dt className="label-caps">{label}</dt>
      <dd className="flex items-end justify-between gap-3">
        <span className="text-xl leading-none font-semibold tracking-tight whitespace-nowrap tabular">
          {typeof value === "string" ? <WithUnit text={value} /> : value}
        </span>
        {trend}
      </dd>
      {hint && <dd className="truncate text-xs text-muted-foreground tabular">{hint}</dd>}
    </div>
  )
}

/** One machine: measured state, hardware, live metrics with 24h trends, guests. */
export function NodePanel({
  node,
  status,
  now,
  spec,
}: {
  node: LabNodeStatus
  status: LabStatus
  now: Date
  spec?: NodeSpec
}) {
  const state = nodeState(node.name, status, now)
  const fresh = isNodeFresh(node, now)
  const received = new Date(node.receivedAt)
  const hardware = [
    node.cpu?.model,
    node.cpu && `${node.cpu.cores} cores / ${node.cpu.threads} threads`,
  ].filter(Boolean)
  const cpu = series(node.history.cpu)
  const mem = series(node.history.mem)
  const netIn = series(node.history.netIn)
  const categories = Object.entries(node.guests?.byCategory ?? {}).filter(([, v]) => v && v[1] > 0)

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title={<span className="text-foreground">{node.name}</span>}
        meta={
          <>
            {!fresh && state?.state !== "down" && (
              <span>as of {timeFormat.format(received)} UTC</span>
            )}
            <LabNodeBadgeView name={node.name} status={status} now={now} />
          </>
        }
      />
      {(hardware.length > 0 || spec?.description) && (
        <div className="space-y-0.5 border-b px-4 py-3 text-sm">
          {hardware.length > 0 && <p className="font-medium">{hardware.join(" · ")}</p>}
          {spec?.description && <p className="text-muted-foreground">{spec.description}</p>}
        </div>
      )}
      {state?.state === "down" ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          Not reporting, and the other nodes see it offline. Last report{" "}
          {formatRelative(node.receivedAt, now)}.
        </p>
      ) : (
        <dl className="grid grid-cols-2 divide-x divide-y border-b [&>*:nth-child(2n+1)]:border-l-0">
          {node.cpu && (
            <Metric
              label="cpu"
              value={formatPercent(node.cpu.pct, 0)}
              hint={node.load && `load ${node.load.join(" · ")}`}
              trend={
                <Sparkline values={cpu} label={`${node.name} CPU %, last 24 hours`} width={64} />
              }
            />
          )}
          {node.mem && (
            <Metric
              label="memory"
              value={formatPercent(node.mem.pct, 0)}
              hint={[
                `of ${node.mem.totalGiB} GiB`,
                node.swap && node.swap.totalGiB > 0 && `swap ${node.swap.pct}%`,
              ]
                .filter(Boolean)
                .join(" · ")}
              trend={
                <Sparkline values={mem} label={`${node.name} memory %, last 24 hours`} width={64} />
              }
            />
          )}
          {node.net && (
            <Metric
              label="network"
              value={formatRate(node.net.inKBps)}
              hint={`in · out ${formatRate(node.net.outKBps)}`}
              trend={
                <Sparkline
                  values={netIn}
                  label={`${node.name} inbound KB/s, last 24 hours`}
                  width={64}
                />
              }
            />
          )}
          <Metric
            label="uptime"
            value={node.online ? formatUptime(node.uptime) : "—"}
            hint={
              node.availability24h !== null
                ? `${formatPercent(node.availability24h)} up · 24h`
                : "24h availability once there's an hour of data"
            }
          />
        </dl>
      )}
      {node.guests && state?.state !== "down" && (
        <div className="mt-auto space-y-2 px-4 py-3">
          <p className="text-sm">
            <span className="font-medium tabular">
              {node.guests.running}/{node.guests.total}
            </span>{" "}
            <span className="text-muted-foreground">guests running</span>
          </p>
          {categories.length > 0 && (
            <ul aria-label={`${node.name} guests by category`} className="flex flex-wrap gap-1.5">
              {categories.map(([category, [running, total]]) => (
                <li
                  key={category}
                  className="rounded-full border px-2 py-0.5 font-mono text-xs text-muted-foreground tabular"
                >
                  {category} {running === total ? running : `${running}/${total}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Panel>
  )
}

function StoragePanel({ status, now }: { status: LabStatus; now: Date }) {
  const rows = status.nodes.flatMap((node) =>
    (node.storage ?? []).map((pool) => ({ node, pool })),
  ) as { node: LabNodeStatus; pool: LabStorage }[]
  if (rows.length === 0) return null
  // Pools first (largest first), then the off-site backup store, in one list.
  const ordered = [
    ...rows.filter((r) => r.pool.kind === "pool").sort((a, b) => b.pool.totalGiB - a.pool.totalGiB),
    ...rows.filter((r) => r.pool.kind === "backup"),
  ]

  const render = ({ node, pool }: (typeof rows)[number]) => {
    const fresh = isNodeFresh(node, now)
    const health = pool.health
      ? (HEALTH[pool.health] ?? { status: "down" as const, label: pool.health.toLowerCase() })
      : null
    return (
      <DataRow
        key={`${node.name}:${pool.label}`}
        title={pool.label}
        description={pool.kind === "backup" ? "off-site, Proxmox Backup Server" : node.name}
        // Health is a measured state only while the report is fresh.
        status={health ? (fresh ? health : { status: "idle", label: "no data" }) : undefined}
        meta={[
          `${formatBytes(pool.usedGiB)} / ${formatBytes(pool.totalGiB)}`,
          formatPercent((pool.usedGiB / pool.totalGiB) * 100, 0),
        ]}
        value={<Meter value={pool.usedGiB} max={pool.totalGiB} label={`${pool.label} used`} />}
      />
    )
  }

  return (
    <Panel>
      <PanelHeader title="storage" meta={<span>zfs pools · backups</span>} />
      <DataList>{ordered.map(render)}</DataList>
    </Panel>
  )
}

/** The whole live dashboard for a status snapshot. Pure: tests render it directly. */
export function LabDashboardView({
  status,
  now,
  specs,
}: {
  status: LabStatus | null | undefined
  now: Date
  specs: NodeSpec[]
}) {
  const nodes = [...(status?.nodes ?? [])].sort((a, b) => {
    // The Studio's Homelab order first (Tower, Mini PC #1, …), then the rest by name.
    const ia = specs.findIndex((s) => s.name === a.name)
    const ib = specs.findIndex((s) => s.name === b.name)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.name.localeCompare(b.name)
  })
  const overview = specs.filter((spec) => !nodes.some((n) => n.name === spec.name))
  const updated = lastReceived(status)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {status ? (
          <LabSummaryView status={status} now={now} className="label-caps" />
        ) : (
          <StatusPill status="idle">no data yet</StatusPill>
        )}
        <span className="label-caps">
          {updated
            ? `updated ${formatRelative(updated, now)} · reports every 30s`
            : "the lab hasn't reported yet"}
        </span>
      </div>

      {overview.length > 0 && (
        <Panel>
          <PanelHeader title="overview" />
          <DataList>
            {overview.map((spec) => (
              <DataRow key={spec.name} title={spec.name} description={spec.description} />
            ))}
          </DataList>
        </Panel>
      )}

      {status && nodes.length > 0 && (
        <section aria-label="Nodes" className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {nodes.map((node) => (
            <NodePanel
              key={node.name}
              node={node}
              status={status}
              now={now}
              spec={specs.find((s) => s.name === node.name)}
            />
          ))}
        </section>
      )}

      {status && <StoragePanel status={status} now={now} />}
    </div>
  )
}

/** Client wrapper: seeded with the server snapshot, then kept fresh by the shared 30s poll. */
export function LabDashboard({ initial, specs }: { initial: LabStatus | null; specs: NodeSpec[] }) {
  const { status, now } = useLabStatus(initial)
  return <LabDashboardView status={status ?? initial} now={now} specs={specs} />
}
