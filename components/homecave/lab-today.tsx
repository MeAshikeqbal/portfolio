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
 * collector (edge traffic and attacks, DNS, internet, backups, scrubs) plus Jellyfin's live
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
  const { edge, dns, wan, media, backup, scrubs, containers, security } = today
  if (!edge && !dns && !wan && !media && !backup && !scrubs && !containers && !security) return null
  const kinds = security
    ? ATTACK_KINDS.map((k) => [KIND_LABEL[k], security.byKind[k] ?? 0] as const).filter(
        ([, n]) => n > 0,
      )
    : []

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
          <Metric
            label="attacks detected"
            value={security ? String(security.attacks24h) : "—"}
            trend={
              security && (
                <Sparkline
                  values={security.hourly}
                  label="Attacks detected per hour, last 24 hours"
                  width={64}
                />
              )
            }
            hint={
              security
                ? `${security.bans === 0 ? "none" : security.bans} banned now · 24h`
                : "not reported"
            }
          />
          <Metric
            label="space saved"
            value={media ? `${media.savedGB} GB` : "—"}
            hint={media ? "re-encoded on the GPU" : "not reported"}
          />
        </dl>
        {kinds.length > 0 && (
          // Broad kinds only: never which paths, apps or addresses were involved.
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t px-4 py-3 text-sm">
            <span className="label-caps">attack types · 24h</span>
            <span className="text-muted-foreground tabular">
              {kinds.map(([label, n]) => `${label} ${n}`).join(" · ")}
            </span>
          </p>
        )}
      </Panel>
    </section>
  )
}
