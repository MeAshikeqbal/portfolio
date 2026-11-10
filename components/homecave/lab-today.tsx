"use client"

import type { ReactNode } from "react"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { Sparkline } from "@/components/dashboard/sparkline"
import { formatCompact, formatPercent, formatRelative } from "@/lib/format"
import { labToday } from "@/lib/lab/services"
import { ATTACK_KINDS, type AttackKind, type BackupStatus, type LabStatus } from "@/lib/lab/types"
import { STATUS_TEXT_CLASS, type Status } from "@/lib/status"
import { Metric } from "./metric"

const BACKUP: Record<BackupStatus, { status: Status; label: string }> = {
  ok: { status: "up", label: "ok" },
  warnings: { status: "warn", label: "with warnings" },
  failed: { status: "down", label: "failed" },
}

const KIND_LABEL: Record<AttackKind, string> = {
  probing: "probing",
  exploit: "exploits",
  bruteforce: "brute force",
  crawler: "crawlers",
  other: "other",
}

const ago = (epochSeconds: number, now: Date) =>
  formatRelative(new Date(epochSeconds * 1000).toISOString(), now) ?? "—"

/** A status word inside a hint: the label carries the state, in its own colour. */
const Word = ({ status, children }: { status: Status; children: ReactNode }) => (
  <span className={STATUS_TEXT_CLASS[status]}>{children}</span>
)

/**
 * "Today in the lab": what the services are doing, measured inside the guests by the lab's
 * collector (edge traffic and security, DNS, internet, backups, scrubs, containers) plus Jellyfin's live
 * stream count. Hidden until the collector has reported; a missing reading shows "—".
 */
export function LabTodayView({
  status,
  now,
  streams,
}: {
  status: LabStatus | null | undefined
  now: Date
  /** Jellyfin streams right now: undefined while loading, null when not connected. */
  streams?: number | null
}) {
  const today = labToday(status, now)
  const { edge, dns, wan, backup, scrubs, containers, security } = today
  if (!edge && !dns && !wan && !backup && !scrubs && !containers && !security) return null
  // "brute force 2,228 · exploits 889", largest first, skipping empty kinds.
  const describe = (byKind: Partial<Record<AttackKind, number>> | undefined) =>
    ATTACK_KINDS.map((k) => [KIND_LABEL[k], byKind?.[k] ?? 0] as const)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([label, n]) => `${label} ${n.toLocaleString("en-US")}`)
  const blocked = describe(security?.blocklist?.byKind)
  const detected = describe(security?.byKind)

  const rpm = (v: number) => (v < 10 ? v.toFixed(1).replace(/\.0$/, "") : String(Math.round(v)))

  return (
    <section aria-labelledby="homecave-today">
      <Panel>
        <PanelHeader
          title={
            <h2 id="homecave-today" className="text-foreground">
              today in the lab
            </h2>
          }
          meta={<span className="hidden sm:inline">measured inside the guests</span>}
        />
        <dl className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          <Metric
            label="edge traffic"
            value={edge ? `${rpm(edge.rpm)} req/min` : "—"}
            trend={
              edge && (
                <Sparkline
                  values={edge.trend}
                  label="Public requests per minute, last 24 hours"
                  width={64}
                />
              )
            }
            hint={
              edge ? (
                <>
                  <Word status={edge.errPct >= 5 ? "warn" : "up"}>
                    {formatPercent(edge.errPct)} errors
                  </Word>{" "}
                  · 2h
                </>
              ) : (
                "not reported"
              )
            }
          />
          <Metric
            label="dns blocked"
            value={dns ? formatPercent(dns.blockedPct) : "—"}
            hint={
              dns
                ? `of ${formatCompact(dns.queries)} queries · ${dns.hours >= 24 ? "24h" : `last ${dns.hours}h`}`
                : "not reported"
            }
          />
          <Metric
            label="internet"
            value={wan?.rttMs != null ? `${wan.rttMs} ms` : "—"}
            hint={
              wan ? (
                <Word status={wan.lossPct === 0 ? "up" : wan.lossPct < 50 ? "warn" : "down"}>
                  {wan.lossPct}% packet loss
                </Word>
              ) : (
                "not reported"
              )
            }
          />
          <Metric
            label="streaming"
            value={typeof streams === "number" ? String(streams) : "—"}
            hint={
              streams === undefined
                ? "checking Jellyfin…"
                : streams === null
                  ? "not connected"
                  : "on Jellyfin, now"
            }
          />
          <Metric
            label="last backup"
            value={backup ? ago(backup.at, now) : "—"}
            hint={
              backup ? (
                <>
                  <Word status={BACKUP[backup.status].status}>{BACKUP[backup.status].label}</Word>
                  {` · ${backup.covered}/${backup.total} guests`}
                </>
              ) : (
                "not reported"
              )
            }
          />
          <Metric
            label="last scrub"
            value={scrubs ? ago(scrubs.oldestAt, now) : "—"}
            hint={
              scrubs ? (
                <>
                  <Word status={scrubs.errors === 0 ? "up" : "down"}>
                    {scrubs.errors === 0 ? "no errors" : `${scrubs.errors} errors`}
                  </Word>
                  {` · ${scrubs.pools} pools`}
                </>
              ) : (
                "not reported"
              )
            }
          />
          {/* Requests checked moves with traffic every hour; the blocklist is the context. */}
          <Metric
            label={security && !security.checkedHourly ? "attacks detected" : "security checks"}
            value={security ? formatCompact(security.checked24h ?? security.attacks24h) : "—"}
            trend={
              security && (
                <Sparkline
                  values={security.checkedHourly ?? security.hourly}
                  label={
                    security.checkedHourly
                      ? "Requests checked for known attackers per hour, last 24 hours"
                      : "Attacks detected per hour, last 24 hours"
                  }
                  width={64}
                />
              )
            }
            hint={
              security
                ? [
                    security.blocklist && `${formatCompact(security.blocklist.total)} blocklisted`,
                    security.bans > 0 && `${security.bans} banned here`,
                    "24h",
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "not reported"
            }
          />
          <Metric
            label="containers"
            value={containers ? `${containers.ok}/${containers.total}` : "—"}
            hint={
              containers ? (
                <Word status={containers.ok === containers.total ? "up" : "warn"}>
                  {containers.ok === containers.total
                    ? "all healthy"
                    : `${containers.total - containers.ok} not healthy`}
                </Word>
              ) : (
                "not reported"
              )
            }
          />
        </dl>
        {(blocked.length > 0 || detected.length > 0) && (
          // Broad kinds only: never which paths, apps or addresses were involved.
          <div className="flex flex-col gap-1 border-t px-4 py-3 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">
            {blocked.length > 0 && (
              <p className="flex flex-wrap items-baseline gap-x-3">
                <span className="label-caps">blocklist</span>
                <span className="text-muted-foreground tabular">{blocked.join(" · ")}</span>
              </p>
            )}
            {detected.length > 0 && (
              <p className="flex flex-wrap items-baseline gap-x-3">
                <span className="label-caps">detected here · 24h</span>
                <span className="text-muted-foreground tabular">{detected.join(" · ")}</span>
              </p>
            )}
          </div>
        )}
      </Panel>
    </section>
  )
}
