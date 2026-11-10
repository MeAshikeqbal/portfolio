"use client"

import type { ComponentProps } from "react"
import { DataList, DataRow } from "@/components/dashboard/data-list"
import { Meter } from "@/components/dashboard/meter"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { Sparkline } from "@/components/dashboard/sparkline"
import { StatusPill } from "@/components/dashboard/status-pill"
import { LabNodeBadgeView } from "@/components/lab/lab-badges"
import { useLabStatus } from "@/components/lab/use-lab-status"
import { useLiveActivity } from "@/components/live/use-live-activity"
import { LabTodayView } from "./lab-today"
import { Metric } from "./metric"
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
/** CPU temperatures on a fixed 20-100°C scale, so a steady machine reads flat. */
const TEMPERATURE: readonly [number, number] = [20, 100]

/** Values only, gaps dropped: the sparkline draws what was measured. */
const series = (values: (number | null)[] | undefined) =>
  (values ?? []).filter((v): v is number => typeof v === "number")

const slug = (name: string) => `node-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`

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

type Tile = ComponentProps<typeof Metric>

/** A node's metric tiles: the four every node has, then temperature and GPU where reported. */
function nodeTiles(node: LabNodeStatus, live: boolean): Tile[] {
  const tiles: Tile[] = []
  if (node.cpu) {
    tiles.push({
      label: "cpu",
      value: formatPercent(node.cpu.pct, 0),
      hint: node.load && `load ${node.load.map((v) => v.toFixed(2)).join(" · ")}`,
      trend: (
        <Sparkline
          values={series(node.history.cpu)}
          domain={PERCENT}
          label={`${node.name} CPU %, last 24 hours`}
          width={64}
        />
      ),
    })
  }
  if (node.mem) {
    tiles.push({
      label: "memory",
      value: formatPercent(node.mem.pct, 0),
      hint: [
        `of ${node.mem.totalGiB} GiB`,
        node.swap && node.swap.totalGiB > 0 && `swap ${node.swap.pct}%`,
      ]
        .filter(Boolean)
        .join(" · "),
      trend: (
        <Sparkline
          values={series(node.history.mem)}
          domain={PERCENT}
          label={`${node.name} memory %, last 24 hours`}
          width={64}
        />
      ),
    })
  }
  if (node.net) {
    tiles.push({
      label: "network in",
      value: formatRate(node.net.inKBps),
      // The 24h peak is in the trend's text summary; the hint stays short enough not to clip.
      hint: `out ${formatRate(node.net.outKBps)}`,
      trend: (
        <Sparkline
          values={series(node.history.netIn)}
          label={`${node.name} inbound KB/s, last 24 hours`}
          width={64}
        />
      ),
    })
  }
  tiles.push({
    label: "uptime",
    value: live ? formatUptime(node.uptime) : "—",
    hint:
      node.availability24h !== null
        ? `${formatPercent(node.availability24h)} up · 24h`
        : "availability after 1h",
  })
  if (node.temps && (node.temps.cpuC !== null || node.temps.diskC !== null)) {
    tiles.push({
      label: "temperature",
      value: node.temps.cpuC !== null ? `${node.temps.cpuC}°C` : "—",
      hint: node.temps.diskC !== null ? `cpu · hottest disk ${node.temps.diskC}°C` : "cpu",
      trend: (
        <Sparkline
          values={series(node.history.temp)}
          domain={TEMPERATURE}
          label={`${node.name} CPU °C, last 24 hours`}
          width={64}
        />
      ),
    })
  }
  if (node.gpu) {
    const gib = (mib: number) => (mib / 1024).toFixed(1).replace(/\.0$/, "")
    tiles.push({
      label: "gpu",
      value: formatPercent(node.gpu.utilPct, 0),
      hint: [
        `vram ${gib(node.gpu.memUsedMiB)}/${gib(node.gpu.memTotalMiB)} GiB`,
        node.gpu.encoders > 0 && `${node.gpu.encoders} encoding`,
        `${node.gpu.tempC}°C`,
      ]
        .filter(Boolean)
        .join(" · "),
      trend: (
        <Sparkline
          values={series(node.history.gpu)}
          domain={PERCENT}
          label={`${node.name} GPU %, last 24 hours`}
          width={64}
        />
      ),
    })
  }
  return tiles
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
  const categories = Object.entries(node.guests?.byCategory ?? {}).filter(([, v]) => v && v[1] > 0)
  const id = slug(node.name)
  const tiles = nodeTiles(node, live)

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
          {tiles.map((tile, i) => (
            // An odd tile out spans the row, so the grid never shows an empty cell.
            <Metric
              key={tile.label}
              {...tile}
              className={cn(i === tiles.length - 1 && tiles.length % 2 === 1 && "col-span-2")}
            />
          ))}
        </dl>
        {node.guests && (
          <div className={cn("space-y-2 px-4 py-3", !live && "opacity-55")}>
            <p className="text-sm">
              <span className="font-medium tabular">
                {node.guests.running}/{node.guests.total}
              </span>{" "}
              <span className="text-muted-foreground">guests running</span>
              {node.containers && node.containers.total > 0 && (
                <>
                  <span className="text-muted-foreground"> · </span>
                  <span
                    className={cn(
                      "font-medium tabular",
                      live && node.containers.ok < node.containers.total && STATUS_TEXT_CLASS.warn,
                    )}
                  >
                    {node.containers.ok}/{node.containers.total}
                  </span>{" "}
                  <span className="text-muted-foreground">containers healthy</span>
                </>
              )}
            </p>
            {categories.length > 0 && (
              <ul aria-label={`${node.name} guests by category`} className="flex flex-wrap gap-1.5">
                {categories.map(([category, [running, total]]) => {
                  const use = node.resources?.[category as keyof typeof node.resources]
                  return (
                    <li
                      key={category}
                      className="rounded-full border px-2 py-0.5 font-mono text-xs text-muted-foreground tabular"
                    >
                      {category} {running === total ? running : `${running}/${total}`}
                      {use && use.memGiB >= 0.1 && (
                        <span> · {use.memGiB} GiB</span>
                      )}
                    </li>
                  )
                })}
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
  streams,
}: {
  status: LabStatus | null | undefined
  now: Date
  specs: NodeSpec[]
  /** Jellyfin streams now (undefined while loading, null when not connected). */
  streams?: number | null
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
      <LabTodayView status={status} now={now} streams={streams} />
    </div>
  )
}

/** Client wrapper: seeded with the server snapshot, then kept fresh by the shared 30s poll. */
export function LabDashboard({ initial, specs }: { initial: LabStatus | null; specs: NodeSpec[] }) {
  const { status, now } = useLabStatus(initial)
  const live = useLiveActivity()
  const streams = live === undefined ? undefined : (live?.jellyfin?.streams ?? null)
  return <LabDashboardView status={status ?? initial} now={now} specs={specs} streams={streams} />
}
