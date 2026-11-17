"use client"

import { useLocale, useTranslations } from "next-intl"
import type { ReactNode } from "react"
import { StatusDot } from "@/components/dashboard/status-dot"
import { useLabStatus } from "@/components/lab/use-lab-status"
import { formatPercent } from "@/lib/format"
import { labTopology, type TopologyMachine } from "@/lib/lab/topology"
import type { LabStatus } from "@/lib/lab/types"
import type { Status } from "@/lib/status"
import { cn } from "@/lib/utils"

/** A vertical connector between tiers. */
const Wire = () => <div aria-hidden className="mx-auto h-5 w-px bg-border-strong sm:h-6" />

/** One box in the drawing: a status dot, a name, a right-hand note, and its readings below. */
function Box({
  status,
  statusLabel,
  title,
  note,
  children,
  className,
}: {
  status: Status
  statusLabel: string
  title: ReactNode
  note?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("rounded-lg border bg-surface p-3 sm:p-4", className)}>
      <div className="flex items-center gap-2">
        <StatusDot status={status} label={statusLabel} />
        <span className="min-w-0 truncate font-medium">{title}</span>
        {note && <span className="ml-auto shrink-0 label-caps">{note}</span>}
      </div>
      {children && <div className="mt-2 space-y-2 text-sm text-muted-foreground">{children}</div>}
    </div>
  )
}

function useStatusLabel() {
  const t = useTranslations("homecave")
  return (status: Status) =>
    status === "up"
      ? t("nodeUp")
      : status === "down"
        ? t("nodeDown")
        : status === "warn"
          ? t("degraded")
          : t("noData")
}

function MachineBox({ machine }: { machine: TopologyMachine }) {
  const t = useTranslations("homecave")
  const label = useStatusLabel()
  const state = machine.state
  const note = !state
    ? t("noData")
    : state.state === "up"
      ? t("nodeUpFor", { uptime: state.uptime ?? "" })
      : state.state === "down"
        ? t("nodeDown")
        : t("noData")

  return (
    <Box
      status={state?.status ?? "idle"}
      statusLabel={note}
      title={machine.name}
      note={note}
      className="h-full"
    >
      {machine.roles.length > 0 && (
        <ul aria-label={t("topologyRoles")} className="flex flex-wrap gap-1.5">
          {machine.roles.map((role) => (
            <li key={role} className="rounded-sm bg-surface-2 px-1.5 py-0.5 label-caps">
              {t("topologyRole", { role })}
            </li>
          ))}
        </ul>
      )}
      {machine.services.length > 0 && (
        <ul aria-label={t("topologyServices", { name: machine.name })} className="space-y-1">
          {machine.services.map((service) => (
            <li key={service.name} className="flex items-center gap-2">
              <StatusDot status={service.status} label={label(service.status)} />
              <span className="min-w-0 truncate text-foreground">{service.name}</span>
            </li>
          ))}
        </ul>
      )}
      {machine.pools.length > 0 && (
        <ul aria-label={t("topologyPools", { name: machine.name })} className="space-y-1">
          {machine.pools.map((pool) => (
            <li key={pool.name} className="flex items-center gap-2">
              <StatusDot
                status={pool.status}
                label={
                  pool.status === "up"
                    ? t("healthy")
                    : pool.status === "warn"
                      ? t("degraded")
                      : pool.status === "down"
                        ? (pool.health ?? "").toLowerCase()
                        : t("noData")
                }
              />
              <span className="min-w-0 truncate">{pool.name}</span>
              <span className="ml-auto shrink-0 tabular">
                {t("topologyUsed", { pct: formatPercent(pool.usedPct, 0) })}
              </span>
            </li>
          ))}
        </ul>
      )}
      {machine.guests && (
        <p className="tabular">
          {t("guestsRunning", { running: machine.guests.running, total: machine.guests.total })}
        </p>
      )}
    </Box>
  )
}

/**
 * How the lab fits together, top to bottom: the internet line, what faces the internet and
 * where it runs, the machines with their services and pools, the off-site backups. Pure, from
 * a status snapshot (lib/lab/topology.ts); tests render it directly.
 */
export function LabTopologyView({
  status,
  now,
  order = [],
}: {
  status: LabStatus
  now: Date
  /** The Studio's machine order, as the dashboard uses. */
  order?: readonly string[]
}) {
  const t = useTranslations("homecave")
  const locale = useLocale()
  const label = useStatusLabel()
  const { internet, edge, dns, machines, backups } = labTopology(status, now, order)
  if (machines.length === 0) return null
  const columns = Math.min(machines.length, 3)
  const number = (n: number) => n.toLocaleString(locale)

  return (
    <div role="group" aria-label={t("topologyLabel")} className="mx-auto max-w-5xl">
      {internet && (
        <>
          <Box
            status={internet.status}
            statusLabel={label(internet.status)}
            title={t("internetName")}
            note={t("topologyFrom", { node: internet.node })}
            className="mx-auto max-w-sm"
          >
            <p className="tabular">
              {internet.rttMs !== null &&
                `${t("topologyRtt", { ms: Math.round(internet.rttMs) })} · `}
              {t("packetLoss", { pct: internet.lossPct })}
            </p>
          </Box>
          <Wire />
        </>
      )}

      {(edge || dns) && (
        <>
          <div
            className={cn(
              "mx-auto grid gap-3",
              edge && dns ? "max-w-2xl sm:grid-cols-2" : "max-w-sm",
            )}
          >
            {edge && (
              <Box
                status={edge.status}
                statusLabel={label(edge.status)}
                title={t("topologyEdge")}
                note={t("topologyOn", { node: edge.node })}
              >
                <p className="tabular">
                  {t("reqPerMin", { rate: number(edge.rpm) })} ·{" "}
                  {t("errors", { pct: formatPercent(edge.errPct) })}
                </p>
              </Box>
            )}
            {dns && (
              <Box
                status={dns.status}
                statusLabel={label(dns.status)}
                title={t("topologyDns")}
                note={t("topologyOn", { node: dns.node })}
              >
                <p className="tabular">
                  {t("topologyBlocked", { pct: formatPercent(dns.blockedPct) })} ·{" "}
                  {t("topologyQueries", { count: dns.queries })}
                </p>
              </Box>
            )}
          </div>
          <Wire />
        </>
      )}

      {/* The machines hang off one rail: a line across their centres, a tick down to each. */}
      <div className="relative">
        <div
          aria-hidden
          className="absolute top-0 hidden h-px bg-border-strong md:block"
          style={{ left: `${50 / columns}%`, right: `${50 / columns}%` }}
        />
        <ul
          aria-label={t("topologyMachines", { count: machines.length })}
          className={cn(
            "grid gap-x-4 gap-y-5 md:pt-5",
            columns === 3 ? "md:grid-cols-3" : columns === 2 ? "md:grid-cols-2" : "",
          )}
        >
          {machines.map((machine) => (
            <li key={machine.name} className="relative">
              <div
                aria-hidden
                className="absolute -top-5 left-1/2 hidden h-5 w-px bg-border-strong md:block"
              />
              <MachineBox machine={machine} />
            </li>
          ))}
        </ul>
      </div>

      {backups && (
        <>
          <Wire />
          <Box
            status={backups.status}
            statusLabel={label(backups.status)}
            title={t("topologyBackups")}
            note={t("topologyFrom", { node: backups.node })}
            className="mx-auto max-w-sm"
          >
            {backups.result && (
              <p className="tabular">
                {t("topologyBackupRound", { status: backups.result })}
                {backups.covered !== null &&
                  backups.total !== null &&
                  t("backupGuests", { covered: backups.covered, total: backups.total })}
              </p>
            )}
            {backups.usedPct !== null && (
              <p className="tabular">
                {t("topologyUsed", { pct: formatPercent(backups.usedPct, 0) })}
              </p>
            )}
          </Box>
        </>
      )}
    </div>
  )
}

/** Client wrapper: the server snapshot first, then the page's shared 30s poll. */
export function LabTopology({
  initial,
  renderedAt,
  order,
}: {
  initial: LabStatus | null
  renderedAt: string
  order: readonly string[]
}) {
  const { status, now } = useLabStatus(initial, renderedAt)
  const current = status ?? initial
  if (!current) return null
  return <LabTopologyView status={current} now={now} order={order} />
}
