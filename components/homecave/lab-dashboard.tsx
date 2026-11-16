"use client"

import { Camera } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import type { ComponentProps } from "react"
import { DataList, DataRow } from "@/components/dashboard/data-list"
import { Meter } from "@/components/dashboard/meter"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { Sparkline } from "@/components/dashboard/sparkline"
import { StatusPill } from "@/components/dashboard/status-pill"
import { Button } from "@/components/ui/button"
import { LabNodeBadgeView } from "@/components/lab/lab-badges"
import { useLabStatus } from "@/components/lab/use-lab-status"
import { useLiveActivity } from "@/components/live/use-live-activity"
import { LabTodayView } from "./lab-today"
import { Metric } from "./metric"
import { formatBytes, formatPercent, formatRate, formatRelative } from "@/lib/format"
import { formatUptime, nodeState } from "@/lib/lab/freshness"
import { labVerdict, orderNodes, storageRows } from "@/lib/lab/snapshot"
import type { LabNodeStatus, LabStatus } from "@/lib/lab/types"
import { STATUS_TEXT_CLASS } from "@/lib/status"
import { cn } from "@/lib/utils"
import { localizedPath } from "@/i18n/locales"
import type { HomecaveT } from "@/i18n/translator"

/** A Homecave "Homelab" row from the Studio: its description is the node's role line. */
export interface NodeSpec {
  name: string
  description: string | null
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
  const t = useTranslations("homecave")
  const lab = useTranslations("lab")
  const locale = useLocale()
  const { summary, items, updated, reporting, total } = labVerdict(status, now, t)

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
        {[
          reporting < total && t("reporting", { reporting, total }),
          updated && t("updated", { ago: formatRelative(updated, now, locale) ?? "—" }),
          t("reportsEvery"),
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {/* Screen readers hear the cluster state when it changes, not every 30s tick. */}
      <span className="sr-only" aria-live="polite">
        {summary
          ? t("announce", {
              summary:
                summary.up === null
                  ? lab("noData")
                  : lab("summary", { up: summary.up, total: summary.total }),
            })
          : ""}
      </span>
    </div>
  )
}

type Tile = ComponentProps<typeof Metric>

/** A node's metric tiles: the four every node has, then temperature and GPU where reported. */
function nodeTiles(node: LabNodeStatus, live: boolean, t: HomecaveT): Tile[] {
  const tiles: Tile[] = []
  const name = node.name
  if (node.cpu) {
    tiles.push({
      label: t("cpu"),
      value: formatPercent(node.cpu.pct, 0),
      hint: node.load && t("load", { values: node.load.map((v) => v.toFixed(2)).join(" · ") }),
      trend: (
        <Sparkline
          values={series(node.history.cpu)}
          domain={PERCENT}
          label={t("trendCpu", { name })}
          width={64}
        />
      ),
    })
  }
  if (node.mem) {
    tiles.push({
      label: t("memory"),
      value: formatPercent(node.mem.pct, 0),
      hint: [
        t("ofGiB", { total: node.mem.totalGiB }),
        node.swap && node.swap.totalGiB > 0 && t("swap", { pct: node.swap.pct }),
      ]
        .filter(Boolean)
        .join(" · "),
      trend: (
        <Sparkline
          values={series(node.history.mem)}
          domain={PERCENT}
          label={t("trendMemory", { name })}
          width={64}
        />
      ),
    })
  }
  if (node.net) {
    tiles.push({
      label: t("networkIn"),
      value: formatRate(node.net.inKBps),
      // The 24h peak is in the trend's text summary; the hint stays short enough not to clip.
      hint: t("out", { rate: formatRate(node.net.outKBps) }),
      trend: (
        <Sparkline
          values={series(node.history.netIn)}
          label={t("trendNetwork", { name })}
          width={64}
        />
      ),
    })
  }
  tiles.push({
    label: t("uptime"),
    value: live ? formatUptime(node.uptime) : "—",
    hint:
      node.availability24h !== null
        ? t("upDay", { pct: formatPercent(node.availability24h) })
        : t("availabilityLater"),
  })
  if (node.temps && (node.temps.cpuC !== null || node.temps.diskC !== null)) {
    tiles.push({
      label: t("temperature"),
      value: node.temps.cpuC !== null ? `${node.temps.cpuC}°C` : "—",
      hint: node.temps.diskC !== null ? t("hottestDisk", { temp: node.temps.diskC }) : t("cpuHint"),
      trend: (
        <Sparkline
          values={series(node.history.temp)}
          domain={TEMPERATURE}
          label={t("trendTemperature", { name })}
          width={64}
        />
      ),
    })
  }
  if (node.gpu) {
    const gib = (mib: number) => (mib / 1024).toFixed(1).replace(/\.0$/, "")
    tiles.push({
      label: t("gpu"),
      value: formatPercent(node.gpu.utilPct, 0),
      hint: [
        t("vram", { used: gib(node.gpu.memUsedMiB), total: gib(node.gpu.memTotalMiB) }),
        node.gpu.encoders > 0 && t("encoding", { count: node.gpu.encoders }),
        `${node.gpu.tempC}°C`,
      ]
        .filter(Boolean)
        .join(" · "),
      trend: (
        <Sparkline
          values={series(node.history.gpu)}
          domain={PERCENT}
          label={t("trendGpu", { name })}
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
  const t = useTranslations("homecave")
  const locale = useLocale()
  const state = nodeState(node.name, status, now)
  const live = state?.state === "up"
  const hardware = [
    node.cpu?.model,
    node.cpu && t("cores", { cores: node.cpu.cores, threads: node.cpu.threads }),
  ].filter(Boolean)
  const categories = Object.entries(node.guests?.byCategory ?? {}).filter(([, v]) => v && v[1] > 0)
  const id = slug(node.name)
  const tiles = nodeTiles(node, live, t)

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
              {!live && (
                <span>
                  {t("lastSeen", { ago: formatRelative(node.receivedAt, now, locale) ?? "—" })}
                </span>
              )}
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
          <p className="border-b px-4 py-3 text-sm">{t("notReporting")}</p>
        )}
        {/* Not live: the last readings stay visible (when it fell over matters), but muted. */}
        <dl
          className={cn(
            "grid grid-cols-2 gap-px border-b bg-border",
            // An odd tile out keeps its half and a blank cell (a pseudo-element, so the dl
            // stays valid) fills the row: every node's tiles and trends sit in the same slots.
            tiles.length % 2 === 1 && "after:bg-surface",
            !live && "opacity-55 grayscale",
          )}
          aria-label={live ? undefined : t("lastReadings", { name: node.name })}
        >
          {tiles.map((tile) => (
            <Metric key={tile.label} {...tile} />
          ))}
        </dl>
        {node.guests && (
          <div className={cn("space-y-2 px-4 py-3", !live && "opacity-55")}>
            <p className="text-sm">
              <span className="font-medium tabular">
                {node.guests.running}/{node.guests.total}
              </span>{" "}
              <span className="text-muted-foreground">{t("guestsLabel")}</span>
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
                  <span className="text-muted-foreground">{t("containersHealthy")}</span>
                </>
              )}
            </p>
            {categories.length > 0 && (
              <ul
                aria-label={t("guestsByCategory", { name: node.name })}
                className="flex flex-wrap gap-1.5"
              >
                {categories.map(([category, [running, total]]) => {
                  const use = node.resources?.[category as keyof typeof node.resources]
                  return (
                    <li
                      key={category}
                      className="rounded-full border px-2 py-0.5 font-mono text-xs text-muted-foreground tabular"
                    >
                      {category} {running === total ? running : `${running}/${total}`}
                      {use && use.memGiB >= 0.1 && <span> · {use.memGiB} GiB</span>}
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
  const t = useTranslations("homecave")
  const rows = storageRows(status, now, t)
  if (rows.length === 0) return null
  const withDots = rows.some((row) => row.health)

  return (
    <section aria-labelledby="homecave-storage">
      <Panel>
        <PanelHeader
          title={
            <h2 id="homecave-storage" className="text-foreground">
              {t("storage")}
            </h2>
          }
          meta={<span>{t("storageMeta")}</span>}
        />
        <DataList>
          {/* Health is a measured state only while the report is fresh; a stale store says so. */}
          {rows.map(({ node, pool, health }) => {
            return (
              <DataRow
                key={`${node.name}:${pool.label}`}
                title={pool.label}
                description={pool.kind === "backup" ? t("backupServer") : node.name}
                status={health}
                // Backups have no measured health: they keep the dot's slot, so their titles
                // line up with the pools (when any pool has a dot to line up with).
                reserveDot={withDots}
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
                        ? t("used", { pool: pool.label })
                        : t("usedOn", { pool: pool.label, node: node.name })
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
  const t = useTranslations("homecave")
  const locale = useLocale()
  const nodes = orderNodes(
    status?.nodes ?? [],
    specs.map((s) => s.name),
  )

  if (!status || nodes.length === 0) {
    // Before the first heartbeat: the Studio's spec sheet, with nothing claimed.
    return (
      <div className="space-y-6">
        <StatusPill status="idle">{t("notReported")}</StatusPill>
        {specs.length > 0 && (
          <Panel>
            <PanelHeader title={t("homelab")} />
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <LabVerdict status={status} now={now} />
        {/* A picture of this moment, drawn on the server from the same public status. */}
        <Button asChild variant="outline" size="sm">
          {/* A file, not a page: a plain link, drawn in the page's language. */}
          <a href={`${localizedPath("/homecave/snapshot", locale)}?download=1`} download>
            <Camera aria-hidden />
            {t("snapshot")} <span className="sr-only">{t("snapshotHint")}</span>
          </a>
        </Button>
      </div>
      <div
        aria-label={t("nodes")}
        role="region"
        className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
      >
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
export function LabDashboard({
  initial,
  renderedAt,
  specs,
}: {
  initial: LabStatus | null
  /** When the server rendered `initial` (ISO), so hydration matches the cached HTML. */
  renderedAt: string
  specs: NodeSpec[]
}) {
  const { status, now } = useLabStatus(initial, renderedAt)
  const live = useLiveActivity()
  const streams = live === undefined ? undefined : (live?.jellyfin?.streams ?? null)
  return <LabDashboardView status={status ?? initial} now={now} specs={specs} streams={streams} />
}
