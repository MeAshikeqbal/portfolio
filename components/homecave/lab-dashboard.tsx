"use client"

import type { ReactNode } from "react"
import { DataList, DataRow } from "@/components/dashboard/data-list"
import { Meter } from "@/components/dashboard/meter"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { Sparkline } from "@/components/dashboard/sparkline"
import { StatusPill } from "@/components/dashboard/status-pill"
import { LabNodeBadgeView } from "@/components/lab/lab-badges"
import { useLabStatus } from "@/components/lab/use-lab-status"
import { formatBytes, formatPercent, formatRate, formatRelative } from "@/lib/format"
import { formatUptime, isNodeFresh, labSummary, lastReceived, nodeState } from "@/lib/lab/freshness"
import type { LabNodeStatus, LabStatus, LabStorage } from "@/lib/lab/types"
import { STATUS_TEXT_CLASS, type Status } from "@/lib/status"
import { cn } from "@/lib/utils"

/** A Homecave "Homelab" row from the Studio: its description is the node's role line. */
export interface NodeSpec {
  name: string
  description: string | null
}

const HEALTH: Record<string, { status: Status; label: string }> = {
  ONLINE: { status: "up", label: "healthy" },
  DEGRADED: { status: "warn", label: "degraded" },
}

const PERCENT: readonly [number, number] = [0, 100]

/** Values only, gaps dropped: the sparkline draws what was measured. */
const series = (values: (number | null)[] | undefined) =>
  (values ?? []).filter((v): v is number => typeof v === "number")

const slug = (name: string) => `node-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`

/** "641 KB/s" → the number at full size, the unit small after a real space; "6%" and "6d" stay whole. */
function WithUnit({ text }: { text: string }) {
  const match = /^([\d.,]+)\s+(.+)$/.exec(text)
  if (!match) return <>{text}</>
  return (
    <>
      {match[1]} <span className="text-xs font-normal text-muted-foreground">{match[2]}</span>
    </>
  )
}

function Metric({
  label,
  value,
  hint,
  trend,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  trend?: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-surface px-4 py-3">
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

/** The whole cluster in one line: what an engineer wants to know in two seconds. */
export function LabVerdict({ status, now }: { status: LabStatus; now: Date }) {
  const summary = labSummary(status, now)
  const fresh = status.nodes.filter((n) => isNodeFresh(n, now))
  const pools = fresh.flatMap((n) => (n.storage ?? []).filter((s) => s.kind === "pool" && s.health))
  const healthy = pools.filter((p) => p.health === "ONLINE").length
  const poolStatus: Status =
    healthy === pools.length ? "up" : pools.some((p) => p.health === "DEGRADED") ? "warn" : "down"
  const guests = fresh.reduce(
    (acc, n) => [acc[0] + (n.guests?.running ?? 0), acc[1] + (n.guests?.total ?? 0)],
    [0, 0],
  )
  const updated = lastReceived(status)
  const reporting = fresh.length

  const items: { key: string; text: string; status?: Status }[] = []
  if (summary) {
    items.push({
      key: "nodes",
      text:
        summary.label === "no data" ? "no data" : `${summary.label.replace(" up", "")} nodes up`,
      status: summary.status,
    })
  }
  if (pools.length > 0) {
    items.push({
      key: "pools",
      text: `${healthy}/${pools.length} pools healthy`,
      status: poolStatus,
    })
  }
  if (guests[1] > 0) items.push({ key: "guests", text: `${guests[0]}/${guests[1]} guests running` })

  return (
    <div className="space-y-2">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xl font-semibold tracking-tight sm:text-2xl">
        {items.map((item, i) => (
          // The separator trails its item, so a wrapped line never starts with a stray dot.
          <span key={item.key} className="flex items-baseline gap-3">
            <span className={cn("tabular", item.status && STATUS_TEXT_CLASS[item.status])}>
              {item.text}
            </span>
            {i < items.length - 1 && (
              <span aria-hidden className="text-muted-foreground">
                ·
              </span>
            )}
          </span>
        ))}
      </p>
      <p className="label-caps">
        {reporting < status.nodes.length
          ? `${reporting} of ${status.nodes.length} reporting · `
          : ""}
        {updated ? `updated ${formatRelative(updated, now)}` : ""} · reports every 30s
      </p>
      {/* Screen readers hear the cluster state when it changes, not every 30s tick. */}
      <span className="sr-only" aria-live="polite">
        {summary ? `Homelab: ${summary.label}` : ""}
      </span>
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
  const live = state?.state === "up"
  const hardware = [
    node.cpu?.model,
    node.cpu && `${node.cpu.cores} cores / ${node.cpu.threads} threads`,
  ].filter(Boolean)
  const cpu = series(node.history.cpu)
  const mem = series(node.history.mem)
  const netIn = series(node.history.netIn)
  const categories = Object.entries(node.guests?.byCategory ?? {}).filter(([, v]) => v && v[1] > 0)
  const id = slug(node.name)

  return (
    <section aria-labelledby={id} className="flex min-w-0">
      <Panel className="flex flex-1 flex-col">
        <PanelHeader
          title={
            <h2 id={id} className="text-foreground">
              {node.name}
            </h2>
          }
          meta={
            <>
              {!live && <span>last seen {formatRelative(node.receivedAt, now)}</span>}
              <LabNodeBadgeView name={node.name} status={status} now={now} compact />
            </>
          }
        />
        {(hardware.length > 0 || spec?.description) && (
          <div className="space-y-0.5 border-b px-4 py-3 text-sm">
            {hardware.length > 0 && <p className="font-medium">{hardware.join(" · ")}</p>}
            {spec?.description && <p className="text-muted-foreground">{spec.description}</p>}
          </div>
        )}
        {state?.state === "down" && (
          <p className="border-b px-4 py-3 text-sm">
            Not reporting, and the other nodes see it offline. Its last readings are below.
          </p>
        )}
        {/* Not live: the last readings stay visible (when it fell over matters), but muted. */}
        <dl
          className={cn(
            "grid grid-cols-2 gap-px border-b bg-border",
            !live && "opacity-55 grayscale",
          )}
          aria-label={live ? undefined : `${node.name}, last readings`}
        >
          {node.cpu && (
            <Metric
              label="cpu"
              value={formatPercent(node.cpu.pct, 0)}
              hint={node.load && `load ${node.load.map((v) => v.toFixed(2)).join(" · ")}`}
              trend={
                <Sparkline
                  values={cpu}
                  domain={PERCENT}
                  label={`${node.name} CPU %, last 24 hours`}
                  width={64}
                />
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
                <Sparkline
                  values={mem}
                  domain={PERCENT}
                  label={`${node.name} memory %, last 24 hours`}
                  width={64}
                />
              }
            />
          )}
          {node.net && (
            <Metric
              label="network in"
              value={formatRate(node.net.inKBps)}
              // The 24h peak is in the trend's text summary; the hint stays short enough not to clip.
              hint={`out ${formatRate(node.net.outKBps)}`}
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
            value={live ? formatUptime(node.uptime) : "—"}
            hint={
              node.availability24h !== null
                ? `${formatPercent(node.availability24h)} up · 24h`
                : "24h availability after an hour of data"
            }
          />
        </dl>
        {node.guests && (
          <div className={cn("space-y-2 px-4 py-3", !live && "opacity-55")}>
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
    </section>
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

  return (
    <section aria-labelledby="homecave-storage">
      <Panel>
        <PanelHeader
          title={
            <h2 id="homecave-storage" className="text-foreground">
              storage
            </h2>
          }
          meta={<span>zfs pools · backups</span>}
        />
        <DataList>
          {ordered.map(({ node, pool }) => {
            const fresh = isNodeFresh(node, now)
            const health = pool.health
              ? (HEALTH[pool.health] ?? {
                  status: "down" as const,
                  label: pool.health.toLowerCase(),
                })
              : null
            // Health is a measured state only while the report is fresh; a stale store says so.
            const shown = !fresh
              ? { status: "idle" as const, label: "no data" }
              : (health ?? undefined)
            return (
              <DataRow
                key={`${node.name}:${pool.label}`}
                title={pool.label}
                description={pool.kind === "backup" ? "Proxmox Backup Server" : node.name}
                status={shown}
                meta={[
                  <span key="size" className="normal-case">
                    {formatBytes(pool.usedGiB)} / {formatBytes(pool.totalGiB)}
                  </span>,
                  formatPercent((pool.usedGiB / pool.totalGiB) * 100, 0),
                ]}
                value={
                  <Meter
                    value={pool.usedGiB}
                    max={pool.totalGiB}
                    label={
                      pool.kind === "backup"
                        ? `${pool.label}, used`
                        : `${pool.label} on ${node.name}, used`
                    }
                  />
                }
              />
            )
          })}
        </DataList>
      </Panel>
    </section>
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

  if (!status || nodes.length === 0) {
    // Before the first heartbeat: the Studio's spec sheet, with nothing claimed.
    return (
      <div className="space-y-6">
        <StatusPill status="idle">the lab hasn&apos;t reported yet</StatusPill>
        {specs.length > 0 && (
          <Panel>
            <PanelHeader title="homelab" />
            <DataList>
              {specs.map((spec) => (
                <DataRow key={spec.name} title={spec.name} description={spec.description} />
              ))}
            </DataList>
          </Panel>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <LabVerdict status={status} now={now} />
      <div aria-label="Nodes" role="region" className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {nodes.map((node) => (
          <NodePanel
            key={node.name}
            node={node}
            status={status}
            now={now}
            spec={specs.find((s) => s.name === node.name)}
          />
        ))}
      </div>
      <StoragePanel status={status} now={now} />
    </div>
  )
}

/** Client wrapper: seeded with the server snapshot, then kept fresh by the shared 30s poll. */
export function LabDashboard({ initial, specs }: { initial: LabStatus | null; specs: NodeSpec[] }) {
  const { status, now } = useLabStatus(initial)
  return <LabDashboardView status={status ?? initial} now={now} specs={specs} />
}
