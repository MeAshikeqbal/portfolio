import {
  buildIncidents,
  buildUptime,
  SAMPLES_PER_DAY,
  writeupFor,
  type LabIncident,
  type UptimeRow,
  type Writeup,
} from "./incidents"
import type { LabRecordRaw } from "./store"

/**
 * The monthly lab report: on the 1st, a cron drafts a post about the month before from
 * Homecave's own records (uptime samples, incident log, changelog), for Ashik to edit and
 * publish. Pure: the route reads Redis and Sanity, this turns the record into the draft.
 * The draft is English, like every post's original; translations follow on publish.
 */

/** "2026-11" → every UTC day in it, "2026-11-01" to "2026-11-30". */
export function monthDays(month: string): string[] {
  const [year, m] = month.split("-").map(Number)
  const count = new Date(Date.UTC(year, m, 0)).getUTCDate()
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)
}

/** The month before `now`'s, as "2026-10" (UTC). */
export function previousMonth(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
    .toISOString()
    .slice(0, 7)
}

export const isMonth = (value: string | null | undefined): value is string =>
  typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)

/** A Lab changelog entry (Sanity `labChange`). */
export interface LabChange {
  date: string
  title: string
  note?: string | null
  category?: string | null
}

export interface UptimeSummary {
  kind: UptimeRow["kind"]
  name: string
  /** Share of the month's samples that were up; null with under a day of samples. */
  pct: number | null
  /** Samples down × 5 minutes, in seconds. */
  downS: number
}

export interface MonthlyReport {
  month: string
  /** The first day with any samples, when recording began during the month; else null. */
  startedOn: string | null
  /** Days of the month with samples. */
  coveredDays: number
  totalDays: number
  /** Machines, then the internet line. */
  machines: UptimeSummary[]
  /** Worst first. */
  services: UptimeSummary[]
  /** Overlapping the month, oldest first; `end` null when still going at drafting time. */
  incidents: (LabIncident & { writeup: Writeup | null })[]
  changes: LabChange[]
}

const SAMPLE_S = (24 * 3600) / SAMPLES_PER_DAY

export function buildMonthlyReport({
  month,
  record,
  changes,
  writeups,
}: {
  month: string
  record: LabRecordRaw
  changes: readonly LabChange[]
  writeups: readonly Writeup[]
}): MonthlyReport {
  const days = monthDays(month)
  const startS = Date.parse(`${days[0]}T00:00:00Z`) / 1000
  const endS = Date.parse(`${days.at(-1)}T00:00:00Z`) / 1000 + 86_400

  const rows = buildUptime(record.rollups, days)
  const summary = (row: UptimeRow): UptimeSummary => {
    let down = 0
    for (const day of row.days) if (day) down += day.total - day.up
    return { kind: row.kind, name: row.name, pct: row.pct, downS: down * SAMPLE_S }
  }
  const covered = days.filter((_, i) => rows.some((row) => (row.days[i]?.total ?? 0) > 0))
  const firstCovered = covered[0] ?? null

  // Every event back to the month's start, judged as of its end; still-bad states are the
  // ones going on now, which only count if they began before the month was out.
  const incidents = buildIncidents(record.events, record.states, endS, endS - startS + 86_400)
    .filter((i) => i.start < endS && (i.end ?? Infinity) >= startS)
    .sort((a, b) => a.start - b.start)
    .map((incident) => ({ ...incident, writeup: writeupFor(incident, writeups, endS) }))

  return {
    month,
    startedOn: firstCovered && firstCovered !== days[0] ? firstCovered : null,
    coveredDays: covered.length,
    totalDays: days.length,
    machines: rows.filter((row) => row.kind !== "svc").map(summary),
    services: rows
      .filter((row) => row.kind === "svc")
      .map(summary)
      .sort((a, b) => b.downS - a.downS || a.name.localeCompare(b.name)),
    incidents,
    changes: changes
      .filter((change) => change.date.startsWith(month))
      .sort((a, b) => a.date.localeCompare(b.date)),
  }
}

// --- The draft post --------------------------------------------------------------------------

const MONTH = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
const STAMP = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
})

const monthName = (month: string) => MONTH.format(new Date(`${month}-01T00:00:00Z`))
const dayName = (day: string) => DAY.format(new Date(`${day}T00:00:00Z`))

/** "3 hr 5 min", "45 min", "2 days 4 hr": rounded the way people say downtime. */
export function spokenDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours < 48) return rest ? `${hours} hr ${rest} min` : `${hours} hr`
  const days = Math.floor(hours / 24)
  return hours % 24 ? `${days} days ${hours % 24} hr` : `${days} days`
}

const percent = (pct: number) => `${pct}%`.replace(".0%", "%")
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** What went wrong, in the log's words ("Frigate down", "Bulk storage on Tower: degraded"). */
export function incidentText(incident: LabIncident): string {
  switch (incident.kind) {
    case "node":
      return incident.state === "nodata" ? `No data from ${incident.name}` : `${incident.name} down`
    case "pool":
      return `${incident.name} on ${incident.node}: ${incident.state.toLowerCase()}`
    case "backup":
      return incident.state === "warnings" ? "Backups finished with warnings" : "Backups failed"
    case "wan":
      return incident.state === "nodata" ? "No data from the internet line" : "Internet down"
    default:
      return incident.state === "nodata" ? `No data from ${incident.name}` : `${incident.name} down`
  }
}

interface Span {
  _type: "span"
  _key: string
  text: string
  marks: string[]
}
interface Block {
  _type: "block"
  _key: string
  style: string
  listItem?: "bullet"
  level?: number
  markDefs: { _type: "link"; _key: string; href: string }[]
  children: Span[]
}
interface Callout {
  _type: "callout"
  _key: string
  tone: "note"
  title: string
  text: string
}

/** A piece of inline text: plain, bold, or a link. */
type Inline = string | { bold: string } | { text: string; href: string }

/** Builds the draft post's Portable Text, with stable keys. */
function blocks() {
  const out: (Block | Callout)[] = []
  let key = 0
  const next = () => `r${(key++).toString(36)}`

  const block = (style: string, parts: Inline[], list = false) => {
    const markDefs: Block["markDefs"] = []
    const children = parts.map((part): Span => {
      if (typeof part === "string") return { _type: "span", _key: next(), text: part, marks: [] }
      if ("bold" in part) return { _type: "span", _key: next(), text: part.bold, marks: ["strong"] }
      const def = { _type: "link" as const, _key: next(), href: part.href }
      markDefs.push(def)
      return { _type: "span", _key: next(), text: part.text, marks: [def._key] }
    })
    out.push({
      _type: "block",
      _key: next(),
      style,
      ...(list && { listItem: "bullet" as const, level: 1 }),
      markDefs,
      children,
    })
  }

  return {
    out,
    h2: (text: string) => block("h2", [text]),
    p: (...parts: Inline[]) => block("normal", parts),
    li: (...parts: Inline[]) => block("normal", parts, true),
    note: (title: string, text: string) =>
      out.push({ _type: "callout", _key: next(), tone: "note", title, text }),
  }
}

function uptimeLine(row: UptimeSummary): Inline[] {
  const name = row.kind === "wan" ? "Internet line" : row.name
  if (row.pct === null) return [{ bold: name }, ": under a day of samples"]
  return [
    { bold: name },
    `: ${percent(row.pct)}`,
    ...(row.downS > 0 ? [` (about ${spokenDuration(row.downS)} down)`] : []),
  ]
}

/** The draft as Sanity post fields: title, slug and body (references are the caller's). */
export function reportPost(report: MonthlyReport, draftedAt: Date) {
  const name = monthName(report.month)
  const { out, h2, p, li, note } = blocks()

  note(
    "Drafted from the lab's own records",
    `Generated on ${DAY.format(draftedAt)} from Homecave's uptime samples, incident log and ` +
      "changelog. Check the numbers, add what they can't say (why things broke, what changed " +
      "and why), then delete this note and publish.",
  )

  const sentences = [
    `In ${name.split(" ")[0]}, the lab logged ${plural(report.incidents.length, "incident", "incidents")} ` +
      `and ${plural(report.changes.length, "planned change", "planned changes")}.`,
  ]
  if (report.startedOn) {
    sentences.push(
      `Recording began on ${dayName(report.startedOn)}, so the numbers cover ` +
        `${report.coveredDays} of the month's ${report.totalDays} days.`,
    )
  }
  p(sentences.join(" "))

  h2("Uptime")
  if (report.machines.length === 0 && report.services.length === 0) {
    p("No uptime samples were recorded this month.")
  }
  for (const row of report.machines) li(...uptimeLine(row))
  if (report.services.length > 0) {
    const troubled = report.services.filter((s) => s.downS > 0)
    const clean = report.services.length - troubled.length
    p(
      troubled.length === 0
        ? `All ${plural(report.services.length, "service", "services")} stayed up the whole time.`
        : `Services with downtime, worst first${clean > 0 ? ` (the other ${clean} stayed up)` : ""}:`,
    )
    for (const row of troubled) li(...uptimeLine(row))
  }

  h2("Incidents")
  if (report.incidents.length === 0) p("Nothing went wrong.")
  for (const incident of report.incidents) {
    const when = `${STAMP.format(new Date(incident.start * 1000))} UTC`
    const length =
      incident.end === null
        ? "still going when this was drafted"
        : spokenDuration(incident.end - incident.start)
    li(
      { bold: when },
      `: ${incidentText(incident)}, ${length}`,
      ...(incident.writeup
        ? [
            " (written up in ",
            { text: incident.writeup.title, href: `/post/${incident.writeup.slug}` },
            ")",
          ]
        : []),
      ".",
    )
  }

  h2("Changes")
  if (report.changes.length === 0) p("No planned changes.")
  for (const change of report.changes) {
    li(
      { bold: dayName(change.date) },
      change.category ? ` · ${change.category}: ` : ": ",
      change.title.replace(/\.$/, ""),
      change.note ? `. ${change.note.replace(/\.$/, "")}.` : ".",
    )
  }

  h2("Next month")
  p("What's planned, and what to keep an eye on.")

  return {
    title: `Lab report: ${name}`,
    slug: `lab-report-${report.month}`,
    body: out,
  }
}
