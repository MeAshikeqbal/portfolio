import { ArrowRight, ChevronRight } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { DataList, DataRow } from "@/components/dashboard/data-list"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { SiteLink } from "@/components/site/smart-link"
import { formatDate, formatDuration, formatPercent } from "@/lib/format"
import {
  dayLevel,
  writeupFor,
  type DayLevel,
  type LabIncident,
  type LabReliability,
  type UptimeRow,
  type Writeup,
} from "@/lib/lab/incidents"
import { formatUtcStamp } from "@/lib/lab/share"
import type { Status } from "@/lib/status"
import type { HomecaveT } from "@/i18n/translator"
import type { HOMECAVE_RECORD_QUERY_RESULT } from "@/sanity.types"
import { cn } from "@/lib/utils"

/** Full uptime is neutral ink: colour is kept for the days something went wrong. */
const LEVEL_CLASS: Record<DayLevel, string> = {
  up: "bg-muted-foreground/55",
  partial: "bg-status-warn",
  down: "bg-status-down",
  none: "bg-border",
}

const LEVELS: DayLevel[] = ["up", "partial", "down", "none"]

/** Incidents shown in the log (newest first, ongoing ones on top). */
const LOG_ROWS = 20

function rowName(row: UptimeRow, t: HomecaveT) {
  return row.kind === "wan" ? t("internetName") : row.name
}

function UptimeRowView({
  row,
  days,
  t,
  locale,
}: {
  row: UptimeRow
  days: string[]
  t: HomecaveT
  locale: string
}) {
  const name = rowName(row, t)
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 px-4 py-2.5 sm:grid-cols-[12rem_1fr_5rem]">
      <span title={name} className="truncate text-sm font-medium">
        {name}
      </span>
      <span className="text-right text-sm text-muted-foreground tabular sm:order-last">
        {row.pct !== null ? formatPercent(row.pct) : "—"}
      </span>
      {/* One label for the row; each day keeps a hover title for the pointer. */}
      <div
        role="img"
        aria-label={
          row.pct !== null
            ? t("uptimeRow", { name, pct: formatPercent(row.pct) })
            : t("uptimeRowEarly", { name })
        }
        className="col-span-2 flex h-6 gap-px sm:col-span-1"
      >
        {row.days.map((day, i) => {
          const level = dayLevel(day)
          return (
            <span
              key={days[i]}
              title={t("uptimeDay", {
                date: formatDate(days[i], locale) ?? days[i],
                level,
                pct: day && day.total > 0 ? formatPercent((day.up / day.total) * 100) : "",
              })}
              className={cn("min-w-0 flex-1 rounded-[1px]", LEVEL_CLASS[level])}
            />
          )
        })}
      </div>
    </li>
  )
}

/** The first day any row has a sample: when logging began, as far as the page can tell. */
function firstDay(record: LabReliability): string | null {
  const index = Math.min(
    ...record.uptime.map((row) => {
      const i = row.days.findIndex((d) => d && d.total > 0)
      return i === -1 ? Infinity : i
    }),
  )
  return Number.isFinite(index) ? record.days[index] : null
}

function UptimePanel({ record, since }: { record: LabReliability; since: string | null }) {
  const t = useTranslations("homecave")
  const locale = useLocale()
  const machines = record.uptime.filter((row) => row.kind !== "svc")
  const services = record.uptime.filter((row) => row.kind === "svc")
  const servicesDown = services.filter((row) =>
    row.days.some((d) => {
      const level = dayLevel(d)
      return level === "partial" || level === "down"
    }),
  ).length

  return (
    <section aria-labelledby="homecave-uptime">
      <Panel>
        <PanelHeader
          title={
            <h3 id="homecave-uptime" className="text-foreground">
              {t("uptimeTitle")}
            </h3>
          }
          meta={<span>{t("uptimeMeta")}</span>}
        />
        {record.uptime.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">{t("uptimeEmpty")}</p>
        ) : (
          <>
            <ul className="divide-y">
              {machines.map((row) => (
                <UptimeRowView
                  key={`${row.kind}:${row.name}`}
                  row={row}
                  days={record.days}
                  t={t}
                  locale={locale}
                />
              ))}
            </ul>
            {services.length > 0 && (
              <details className="group border-t">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 text-sm [&::-webkit-details-marker]:hidden">
                  <ChevronRight
                    aria-hidden
                    className="size-4 text-muted-foreground transition-transform group-open:rotate-90 motion-reduce:transition-none"
                  />
                  <span className="font-medium">
                    {t("uptimeServices", { count: services.length })}
                  </span>
                  <span className="text-muted-foreground">
                    · {t("uptimeServicesDown", { count: servicesDown })}
                  </span>
                </summary>
                <ul className="divide-y border-t">
                  {services.map((row) => (
                    <UptimeRowView
                      key={`${row.kind}:${row.name}`}
                      row={row}
                      days={record.days}
                      t={t}
                      locale={locale}
                    />
                  ))}
                </ul>
              </details>
            )}
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t px-4 py-2 text-xs text-muted-foreground">
              <ul aria-hidden className="flex flex-wrap gap-x-4 gap-y-1">
                {LEVELS.map((level) => (
                  <li key={level} className="flex items-center gap-1.5">
                    <span
                      className={cn("inline-block h-3 w-1.5 rounded-[1px]", LEVEL_CLASS[level])}
                    />
                    {t("uptimeLegend", { level })}
                  </li>
                ))}
              </ul>
              {since && <p>{t("uptimeSince", { date: formatDate(since, locale) ?? since })}</p>}
            </div>
          </>
        )}
      </Panel>
    </section>
  )
}

/** How loud an incident is: only what's still going gets a colour. */
function incidentStatus(incident: LabIncident): Status {
  if (incident.end !== null) return "idle"
  if (incident.kind === "backup" && incident.state === "warnings") return "warn"
  if (incident.kind === "pool" && incident.state === "DEGRADED") return "warn"
  return "down"
}

export function incidentTitle(incident: LabIncident, t: HomecaveT): string {
  return incident.kind === "pool"
    ? t("incidentPool", { name: incident.name, node: incident.node ?? "", state: incident.state })
    : t("incident", { kind: incident.kind, state: incident.state, name: incident.name })
}

function LogPanel({
  record,
  writeups,
  since,
  now,
}: {
  record: LabReliability
  writeups: Writeup[]
  since: string | null
  now: Date
}) {
  const t = useTranslations("homecave")
  const locale = useLocale()
  const nowS = Math.floor(now.getTime() / 1000)
  const rows = record.incidents.slice(0, LOG_ROWS)
  // Logging that began inside the window says so, rather than implying a clean month.
  const recent = since && Date.parse(since) > now.getTime() - 30 * 86_400_000

  return (
    <section aria-labelledby="homecave-log" className="flex min-w-0">
      <Panel className="flex-1">
        <PanelHeader
          title={
            <h3 id="homecave-log" className="text-foreground">
              {t("logTitle")}
            </h3>
          }
          meta={<span>{t("logMeta")}</span>}
        />
        {rows.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            {recent
              ? t("logEmptySince", { date: formatDate(since, locale) ?? since })
              : t("logEmpty")}
          </p>
        ) : (
          <DataList>
            {rows.map((incident) => {
              const ongoing = incident.end === null
              const writeup = writeupFor(incident, writeups, nowS)
              return (
                <DataRow
                  key={`${incident.kind}:${incident.node ?? ""}:${incident.name}:${incident.start}`}
                  title={incidentTitle(incident, t)}
                  status={{
                    status: incidentStatus(incident),
                    label: ongoing ? t("ongoing") : t("resolved"),
                  }}
                  description={
                    writeup && (
                      <SiteLink
                        href={`/post/${writeup.slug}`}
                        className="inline-flex items-center gap-1 text-status-info-fg underline-offset-4 hover:underline"
                      >
                        {t("writeup")}
                        <ArrowRight aria-hidden className="size-3.5" />
                        <span className="sr-only">: {writeup.title}</span>
                      </SiteLink>
                    )
                  }
                  meta={[
                    <span key="duration" className="normal-case">
                      {ongoing
                        ? t("ongoingFor", {
                            duration: formatDuration(nowS - incident.start, locale),
                          })
                        : t("lasted", {
                            duration: formatDuration(incident.end! - incident.start, locale),
                          })}
                    </span>,
                    <span key="when" className="normal-case">
                      {formatUtcStamp(new Date(incident.start * 1000).toISOString(), locale)}
                    </span>,
                  ]}
                />
              )
            })}
          </DataList>
        )}
      </Panel>
    </section>
  )
}

type LabChange = HOMECAVE_RECORD_QUERY_RESULT["changes"][number]

function ChangelogPanel({ changes }: { changes: LabChange[] }) {
  const t = useTranslations("homecave")
  const locale = useLocale()
  return (
    <section aria-labelledby="homecave-changelog" className="flex min-w-0">
      <Panel className="flex-1">
        <PanelHeader
          title={
            <h3 id="homecave-changelog" className="text-foreground">
              {t("changelogTitle")}
            </h3>
          }
          meta={<span>{t("changelogMeta")}</span>}
        />
        <DataList>
          {changes.map((change) => (
            <DataRow
              key={change._id}
              title={change.title}
              description={change.note}
              meta={[
                change.category && t("changeCategory", { category: change.category }),
                <span key="date" className="normal-case">
                  {formatDate(change.date, locale)}
                </span>,
              ].filter(Boolean)}
            />
          ))}
        </DataList>
      </Panel>
    </section>
  )
}

/**
 * Homecave's track record: 90 days of uptime bars, the incident log (linked to write-ups) and
 * the changelog. Rendered on the server from the lab's reliability record and the Studio.
 */
export function LabRecord({
  record,
  changes,
  writeups,
  now,
}: {
  record: LabReliability | null
  changes: LabChange[]
  writeups: Writeup[]
  now: Date
}) {
  if (!record && changes.length === 0) return null
  const since = record ? firstDay(record) : null
  return (
    <div className="space-y-6">
      {record && <UptimePanel record={record} since={since} />}
      <div className={cn("grid gap-6", record && changes.length > 0 && "lg:grid-cols-2")}>
        {record && <LogPanel record={record} writeups={writeups} since={since} now={now} />}
        {changes.length > 0 && <ChangelogPanel changes={changes} />}
      </div>
    </div>
  )
}
