import type { HomecaveT } from "@/i18n/translator"
import { formatBytes, formatDuration, formatPercent, formatRelative } from "@/lib/format"
import { labSummary, nodeState } from "@/lib/lab/freshness"
import type { LabIncident, LabReliability } from "@/lib/lab/incidents"
import { labToday } from "@/lib/lab/services"
import { orderNodes } from "@/lib/lab/snapshot"
import type { LabStatus } from "@/lib/lab/types"
import { siteConfig } from "@/lib/site"

/**
 * The site as plain text, for `curl -L itsashik.dev` (proxy.ts sends command-line clients
 * here instead of HTML). 80 columns, no colour codes (they'd end up in files and pipes), and
 * every link written as a command you can paste.
 */

export const WIDTH = 80

/** The short, curl-able host ("itsashik.dev"), which answers command-line clients itself. */
export const HOST = new URL(siteConfig.url).hostname.replace(/^www\./, "")
/**
 * A copyable address on the bare domain, over HTTPS: it answers curl itself, but plain
 * `curl itsashik.dev` starts on http://, which Vercel always redirects to https (hence -L there).
 */
export const at = (path: string) => `https://${HOST}${path}`

/** Word-wraps `text` to `width`, every line prefixed with `indent`. */
export function wrap(text: string, width = WIDTH, indent = ""): string {
  const lines: string[] = []
  for (const paragraph of text.split("\n")) {
    let line = ""
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && indent.length + line.length + 1 + word.length > width) {
        lines.push(indent + line)
        line = word
      } else {
        line = line ? `${line} ${word}` : word
      }
    }
    lines.push(line ? indent + line : "")
  }
  return lines.join("\n")
}

/** One line of prose from an excerpt: whitespace collapsed, a cut-off word dropped for "…". */
export function excerptLine(text: string, max = 200): string {
  const one = text.replace(/\s+/g, " ").trim()
  if (one.length < max - 1) return one
  return `${one.slice(0, one.lastIndexOf(" ", max - 1)).replace(/[\s,.;:]+$/, "")}…`
}

/**
 * Markdown wrapped to the terminal: paragraphs, list items (with a hanging indent) and quotes
 * are re-flowed; headings, code blocks and hard breaks stay as they are.
 */
export function wrapMarkdown(markdown: string, width = WIDTH): string {
  let fenced = false
  return markdown
    .split("\n")
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) fenced = !fenced
      if (fenced || line.length <= width || /^#|^\s*(```|~~~)|\\$/.test(line)) return line
      const quote = line.match(/^(> ?)+/)?.[0]
      if (quote) return wrap(line.slice(quote.length), width, quote)
      const item = line.match(/^(\s*)([-*+]|\d+\.) /)
      if (item) {
        const hang = " ".repeat(item[0].length)
        return item[0] + wrap(line.slice(item[0].length), width, hang).slice(hang.length)
      }
      return wrap(line, width)
    })
    .join("\n")
}

/** "── writing ─────────── 5 posts": a section rule, its meta flush right. */
export function rule(title: string, meta = ""): string {
  const left = `── ${title} `
  const right = meta ? ` ${meta}` : ""
  return left + "─".repeat(Math.max(3, WIDTH - left.length - right.length)) + right
}

/** Rows as aligned columns (the last column is left ragged). */
export function columns(rows: string[][], gap = 2): string[] {
  const widths: number[] = []
  for (const row of rows) {
    row.slice(0, -1).forEach((cell, i) => (widths[i] = Math.max(widths[i] ?? 0, cell.length)))
  }
  return rows.map((row) =>
    row
      .map((cell, i) => (i < row.length - 1 ? cell.padEnd(widths[i] + gap) : cell))
      .join("")
      .trimEnd(),
  )
}

const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "")

/** One document: blocks joined by blank lines, ending in one newline. */
export const page = (...blocks: (string | null | false | undefined)[]) =>
  `${blocks.filter(Boolean).join("\n\n")}\n`

export function header(): string {
  return [
    `${siteConfig.name.toUpperCase()} · ${siteConfig.role.toLowerCase()}`,
    wrap(siteConfig.tagline),
  ].join("\n")
}

export function links(): string {
  return columns([
    ["site", siteConfig.url],
    ...siteConfig.socialLinks.map((link) => [link.id === "twitter" ? "x" : link.id, link.href]),
    ["source", siteConfig.repo],
    ["rss", `${siteConfig.url}/rss.xml`],
    ["pgp", `${siteConfig.url}/pgp.asc`],
  ]).join("\n")
}

export interface TextPost {
  title: string | null
  slug: string | null
  publishedAt: string | null
  excerpt?: string | null
}

export function postList(posts: readonly TextPost[], { excerpts = false } = {}): string {
  return posts
    .filter((post) => post.slug)
    .map((post) =>
      [
        `${day(post.publishedAt).padEnd(10)}  ${post.title ?? "Untitled"}`,
        `            curl -s ${at(`/post/${post.slug}`)}`,
        ...(excerpts && post.excerpt
          ? [wrap(excerptLine(post.excerpt), WIDTH, "            ")]
          : []),
      ].join("\n"),
    )
    .join("\n")
}

export interface TextProject {
  title: string | null
  slug: string | null
  description: string | null
  status: string | null
  url?: string | null
  github?: string | null
  tech?: string[] | null
}

export function projectList(projects: readonly TextProject[]): string {
  return projects
    .filter((project) => project.slug)
    .map((project) =>
      [
        `${project.title ?? project.slug}${project.status ? `  [${project.status}]` : ""}`,
        ...(project.description ? [wrap(project.description.trim(), WIDTH, "  ")] : []),
        `  curl -s ${at(`/projects/${project.slug}`)}`,
      ].join("\n"),
    )
    .join("\n\n")
}

/** The lab in a few lines: the verdict, then one row per machine. */
export function labLines(
  status: LabStatus | null,
  now: Date,
  order: readonly string[] = [],
): string {
  if (!status || status.nodes.length === 0) return "The lab hasn't reported yet."
  const summary = labSummary(status, now)
  const nodes = orderNodes(status.nodes, order)
  const rows = nodes.map((node) => {
    const state = nodeState(node.name, status, now)
    return [
      node.name,
      state?.state === "up" ? `up ${state.uptime}` : (state?.label ?? "no data"),
      node.cpu && state?.state === "up" ? `cpu ${formatPercent(node.cpu.pct, 0)}` : "",
      node.mem && state?.state === "up" ? `mem ${formatPercent(node.mem.pct, 0)}` : "",
      // Only a machine that's reporting can vouch for its services.
      node.services?.length
        ? state?.state === "up"
          ? `${node.services.filter((s) => s.up).length}/${node.services.length} services up`
          : `${node.services.length} service${node.services.length === 1 ? "" : "s"}`
        : "",
    ]
  })
  return [
    `${summary?.label ?? "no data"} · updated ${formatRelative(lastReport(status), now, "en") ?? "never"}`,
    ...columns(rows).map((row) => `  ${row}`),
  ].join("\n")
}

const lastReport = (status: LabStatus) =>
  status.nodes
    .map((n) => n.receivedAt)
    .sort()
    .at(-1) ?? new Date(0).toISOString()

/** An incident in the log's words ("Frigate down"), from the English messages. */
function incidentTitle(incident: LabIncident, t: HomecaveT): string {
  return incident.kind === "pool"
    ? t("incidentPool", { name: incident.name, node: incident.node ?? "", state: incident.state })
    : t("incident", { kind: incident.kind, state: incident.state, name: incident.name })
}

/** /homecave in text: machines and services, storage, today's numbers, the recent log. */
export function homecaveText(
  status: LabStatus | null,
  record: LabReliability | null,
  now: Date,
  t: HomecaveT,
  order: readonly string[] = [],
): string {
  const nodes = orderNodes(status?.nodes ?? [], order)
  const services = nodes.flatMap((node) =>
    (node.services ?? []).map((service) => [
      `  ${service.name}`,
      node.name,
      nodeState(node.name, status, now)?.state === "up" ? (service.up ? "up" : "down") : "no data",
    ]),
  )
  const pools = nodes.flatMap((node) =>
    (node.storage ?? []).map((pool) => [
      `  ${pool.label}`,
      pool.kind === "backup" ? "off-site" : node.name,
      `${formatBytes(pool.usedGiB)} / ${formatBytes(pool.totalGiB)}`,
      formatPercent((pool.usedGiB / pool.totalGiB) * 100, 0),
      // Health is measured only while the machine reports, as on the dashboard.
      !pool.health
        ? ""
        : nodeState(node.name, status, now)?.state === "up"
          ? pool.health.toLowerCase()
          : "no data",
    ]),
  )
  const today = labToday(status, now)
  const todayRows = [
    today.edge && [
      "  edge",
      `${today.edge.rpm} req/min`,
      `${formatPercent(today.edge.errPct)} errors`,
    ],
    today.dns && [
      "  dns",
      `${formatPercent(today.dns.blockedPct)} blocked`,
      `of ${today.dns.queries.toLocaleString("en")} queries`,
    ],
    today.wan && [
      "  internet",
      today.wan.rttMs !== null ? `${Math.round(today.wan.rttMs)} ms` : "",
      `${today.wan.lossPct}% packet loss`,
    ],
    today.backup && [
      "  last backup",
      today.backup.status,
      `${today.backup.covered}/${today.backup.total} guests`,
    ],
  ].filter((row): row is string[] => Boolean(row))
  const uptime = (record?.uptime ?? [])
    .filter((row) => row.kind !== "svc")
    .map((row) => [
      `  ${row.kind === "wan" ? "Internet" : row.name}`,
      row.pct === null ? "under a day of samples" : `${row.pct}%`,
    ])
  const incidents = (record?.incidents ?? [])
    .slice(0, 8)
    .map((incident) => [
      `  ${new Date(incident.start * 1000).toISOString().slice(0, 16).replace("T", " ")} UTC`,
      incidentTitle(incident, t),
      incident.end === null ? "ongoing" : formatDuration(incident.end - incident.start, "en"),
    ])

  return page(
    `HOMECAVE · the homelab, live\n${wrap("A three-node Proxmox cluster at home. Every machine reports itself every 30 seconds; this is what they last said.")}`,
    rule("machines"),
    labLines(status, now, order),
    services.length > 0 && rule("services"),
    services.length > 0 && columns(services).join("\n"),
    pools.length > 0 && rule("storage"),
    pools.length > 0 && columns(pools).join("\n"),
    todayRows.length > 0 && rule("today"),
    todayRows.length > 0 && columns(todayRows).join("\n"),
    uptime.length > 0 && rule("uptime", "90 days"),
    uptime.length > 0 && columns(uptime).join("\n"),
    record && rule("log", "30 days"),
    record && (incidents.length > 0 ? columns(incidents).join("\n") : "  Nothing has gone wrong."),
    `JSON: curl -s ${at("/api/lab-status")}`,
  )
}

/** What you can ask for next, as commands. */
export function commands(): string {
  return columns([
    [`curl -s ${at("/post")}`, "all posts"],
    [`curl -s ${at("/post/<slug>")}`, "a post, as Markdown"],
    [`curl -s ${at("/projects")}`, "projects"],
    [`curl -s ${at("/homecave")}`, "the homelab, live"],
    [`curl -s ${at("/now")}`, "what I'm doing now"],
    [`curl -s ${at("/resume")}`, "résumé"],
    [`curl -s ${at("/pgp.asc")} | gpg --import`, "my PGP key"],
  ]).join("\n")
}
