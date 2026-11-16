"use client"

import { useLocale, useTranslations } from "next-intl"
import type { ReactNode } from "react"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { Sparkline } from "@/components/dashboard/sparkline"
import { formatCompact, formatNumber, formatPercent, formatRelative } from "@/lib/format"
import { labToday } from "@/lib/lab/services"
import { ATTACK_KINDS, type AttackKind, type BackupStatus, type LabStatus } from "@/lib/lab/types"
import { STATUS_TEXT_CLASS, type Status } from "@/lib/status"
import { Metric } from "./metric"

const BACKUP_STATUS: Record<BackupStatus, Status> = {
  ok: "up",
  warnings: "warn",
  failed: "down",
}

const ago = (epochSeconds: number, now: Date, locale: string) =>
  formatRelative(new Date(epochSeconds * 1000).toISOString(), now, locale) ?? "—"

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
  const t = useTranslations("homecave")
  const locale = useLocale()
  const today = labToday(status, now)
  const { edge, dns, wan, backup, scrubs, containers, security } = today
  if (!edge && !dns && !wan && !backup && !scrubs && !containers && !security) return null
  // "brute force 2,228 · exploits 889", largest first, skipping empty kinds.
  const describe = (byKind: Partial<Record<AttackKind, number>> | undefined) =>
    ATTACK_KINDS.map((kind) => [kind, byKind?.[kind] ?? 0] as const)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([kind, n]) => `${t("attackKind", { kind })} ${formatNumber(n, locale)}`)
  const blocked = describe(security?.blocklist?.byKind)
  const detected = describe(security?.byKind)

  const rpm = (v: number) => (v < 10 ? v.toFixed(1).replace(/\.0$/, "") : String(Math.round(v)))

  return (
    <section aria-labelledby="homecave-today">
      <Panel>
        <PanelHeader
          title={
            <h2 id="homecave-today" className="text-foreground">
              {t("today")}
            </h2>
          }
          meta={<span className="hidden sm:inline">{t("todayMeta")}</span>}
        />
        <dl className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          <Metric
            label={t("edgeTraffic")}
            value={edge ? t("reqPerMin", { rate: rpm(edge.rpm) }) : "—"}
            trend={edge && <Sparkline values={edge.trend} label={t("edgeTrend")} width={64} />}
            hint={
              edge ? (
                <>
                  <Word status={edge.errPct >= 5 ? "warn" : "up"}>
                    {t("errors", { pct: formatPercent(edge.errPct) })}
                  </Word>{" "}
                  · {t("twoHours")}
                </>
              ) : (
                t("missing")
              )
            }
          />
          <Metric
            label={t("dnsBlocked")}
            value={dns ? formatPercent(dns.blockedPct) : "—"}
            hint={
              dns
                ? t("dnsHint", {
                    queries: formatCompact(dns.queries, locale),
                    window: dns.hours >= 24 ? t("day") : t("lastHours", { hours: dns.hours }),
                  })
                : t("missing")
            }
          />
          <Metric
            label={t("internet")}
            value={wan?.rttMs != null ? `${wan.rttMs} ms` : "—"}
            hint={
              wan ? (
                <Word status={wan.lossPct === 0 ? "up" : wan.lossPct < 50 ? "warn" : "down"}>
                  {t("packetLoss", { pct: wan.lossPct })}
                </Word>
              ) : (
                t("missing")
              )
            }
          />
          <Metric
            label={t("streaming")}
            value={typeof streams === "number" ? String(streams) : "—"}
            hint={
              streams === undefined
                ? t("checkingJellyfin")
                : streams === null
                  ? t("notConnected")
                  : t("onJellyfin")
            }
          />
          <Metric
            label={t("lastBackup")}
            value={backup ? ago(backup.at, now, locale) : "—"}
            hint={
              backup ? (
                <>
                  <Word status={BACKUP_STATUS[backup.status]}>
                    {t("backupStatus", { status: backup.status })}
                  </Word>
                  {t("backupGuests", { covered: backup.covered, total: backup.total })}
                </>
              ) : (
                t("missing")
              )
            }
          />
          <Metric
            label={t("lastScrub")}
            value={scrubs ? ago(scrubs.oldestAt, now, locale) : "—"}
            hint={
              scrubs ? (
                <>
                  <Word status={scrubs.errors === 0 ? "up" : "down"}>
                    {scrubs.errors === 0
                      ? t("noErrors")
                      : t("errorCount", { count: scrubs.errors })}
                  </Word>
                  {t("scrubPools", { count: scrubs.pools })}
                </>
              ) : (
                t("missing")
              )
            }
          />
          {/* Requests checked moves with traffic every hour; the blocklist is the context. */}
          <Metric
            label={security && !security.checkedHourly ? t("attacksDetected") : t("securityChecks")}
            value={
              security ? formatCompact(security.checked24h ?? security.attacks24h, locale) : "—"
            }
            trend={
              security && (
                <Sparkline
                  values={security.checkedHourly ?? security.hourly}
                  label={security.checkedHourly ? t("checkedTrend") : t("attacksTrend")}
                  width={64}
                />
              )
            }
            hint={
              security
                ? [
                    security.blocklist &&
                      t("blocklisted", { count: formatCompact(security.blocklist.total, locale) }),
                    security.bans > 0 && t("banned", { count: security.bans }),
                    t("day"),
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : t("missing")
            }
          />
          <Metric
            label={t("containers")}
            value={containers ? `${containers.ok}/${containers.total}` : "—"}
            hint={
              containers ? (
                <Word status={containers.ok === containers.total ? "up" : "warn"}>
                  {containers.ok === containers.total
                    ? t("allHealthy")
                    : t("notHealthy", { count: containers.total - containers.ok })}
                </Word>
              ) : (
                t("missing")
              )
            }
          />
        </dl>
        {(blocked.length > 0 || detected.length > 0) && (
          // Broad kinds only: never which paths, apps or addresses were involved.
          <div className="flex flex-col gap-1 border-t px-4 py-3 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">
            {blocked.length > 0 && (
              <p className="flex flex-wrap items-baseline gap-x-3">
                <span className="label-caps">{t("blocklist")}</span>
                <span className="text-muted-foreground tabular">{blocked.join(" · ")}</span>
              </p>
            )}
            {detected.length > 0 && (
              <p className="flex flex-wrap items-baseline gap-x-3">
                <span className="label-caps">{t("detectedHere")}</span>
                <span className="text-muted-foreground tabular">{detected.join(" · ")}</span>
              </p>
            )}
          </div>
        )}
      </Panel>
    </section>
  )
}
