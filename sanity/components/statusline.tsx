import { Card, Flex } from "@sanity/ui"
import { useEffect, useState } from "react"
import { useClient, type NavbarProps } from "sanity"
import { Link } from "sanity/router"

import { formatDate } from "../../lib/format"
import type { LabStatus } from "../../lib/lab/types"
import { siteConfig } from "../../lib/site"
import { dataset as contentDataset } from "../env"
import { inboxDatasetName } from "../inbox/dataset"
import { LABEL_CAPS, StatusDot, StatusWord, useSiteTokens } from "./status"
import { statuslineCells, type StatuslineCell, type StatuslineData } from "./statusline-logic"

const API_VERSION = "2026-11-01"
const POLL_MS = 60_000

const CONTENT_QUERY = `{
  "syncedAt": *[_type == "project" && !(_id in path("drafts.**")) && !(_id in path("versions.**")) && defined(githubData.syncedAt)]
    | order(githubData.syncedAt desc)[0].githubData.syncedAt,
  "drafts": count(*[_id in path("drafts.**")])
}`
const INBOX_QUERY = `count(*[_type == "message" && status == "unread"])`

/** Polls the statusline's sources once a minute, paused while the tab is hidden. */
function useStatuslineData(): { data: StatuslineData; now: Date } {
  const client = useClient({ apiVersion: API_VERSION })
  const [state, setState] = useState<{ data: StatuslineData; now: Date }>({
    data: {},
    now: new Date(),
  })

  useEffect(() => {
    let cancelled = false
    const content = client.withConfig({ dataset: contentDataset })
    const inbox = client.withConfig({ dataset: inboxDatasetName })

    // Each source fails on its own: a failed cell is left out, the rest still show.
    const settle = <T,>(promise: Promise<T>) => promise.catch(() => undefined)

    async function load() {
      const [counts, unread, lab] = await Promise.all([
        settle(
          content.fetch<{ syncedAt: string | null; drafts: number }>(
            CONTENT_QUERY,
            {},
            { perspective: "raw" },
          ),
        ),
        settle(inbox.fetch<number>(INBOX_QUERY, {}, { perspective: "raw" })),
        settle(
          fetch("/api/lab-status").then((r) =>
            r.ok ? (r.json() as Promise<LabStatus | null>) : undefined,
          ),
        ),
      ])
      if (cancelled) return
      setState({
        data: { syncedAt: counts?.syncedAt, drafts: counts?.drafts, unread, lab },
        now: new Date(),
      })
    }

    load()
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load()
    }, POLL_MS)
    const onVisible = () => document.visibilityState === "visible" && load()
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [client])

  return state
}

const CELL_STYLE = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "0 12px",
  flexShrink: 0,
  whiteSpace: "nowrap",
  color: "inherit",
  textDecoration: "none",
} as const

function CellContent({ cell }: { cell: StatuslineCell }) {
  return (
    <>
      {cell.dots ? (
        <span style={{ display: "inline-flex", gap: 4 }}>
          {cell.dots.map((dot) => (
            <StatusDot key={dot.label} status={dot.status} label={dot.label} size={6} />
          ))}
        </span>
      ) : (
        cell.status && <StatusDot status={cell.status} size={6} />
      )}
      {cell.status ? <StatusWord status={cell.status}>{cell.label}</StatusWord> : cell.label}
    </>
  )
}

function Cell({ cell, first }: { cell: StatuslineCell; first: boolean }) {
  const t = useSiteTokens()
  const style = { ...CELL_STYLE, borderLeft: first ? undefined : `1px solid ${t.border}` }
  if (!cell.href) {
    return (
      <span style={style}>
        <CellContent cell={cell} />
      </span>
    )
  }
  if (cell.external) {
    return (
      <a
        href={cell.href}
        target="_blank"
        rel="noopener"
        style={style}
        className="studio-statusline-link"
      >
        <CellContent cell={cell} />
      </a>
    )
  }
  return (
    <Link href={cell.href} style={style} className="studio-statusline-link">
      <CellContent cell={cell} />
    </Link>
  )
}

const BUILD_SHA = process.env.BUILD_SHA
const BUILT_ON = formatDate(process.env.BUILD_TIME)

const LINK_CSS = `
.studio-statusline-link:hover, .studio-statusline-link:focus-visible { color: var(--card-fg-color); }
.studio-statusline-link:focus-visible { outline: 2px solid var(--card-focus-ring-color); outline-offset: -2px; }
`

/**
 * The site's system bar, under the Studio navbar: GitHub sync health, the homelab, unread
 * messages, pending drafts and the deployed build. Measured facts only; a cell is hidden until
 * its data exists.
 */
export function Statusline() {
  const { data, now } = useStatuslineData()
  const t = useSiteTokens()
  const cells = statuslineCells(data, now)

  return (
    <Card
      as="section"
      aria-label="Site status"
      style={{
        ...LABEL_CAPS,
        height: 32,
        flexShrink: 0,
        borderBottom: `1px solid ${t.border}`,
        color: t["muted-foreground"],
        overflow: "hidden",
      }}
    >
      <style>{LINK_CSS}</style>
      <Flex align="stretch" style={{ height: "100%" }}>
        <Flex align="stretch" style={{ minWidth: 0, overflow: "hidden", paddingLeft: 4 }}>
          {cells.map((cell, i) => (
            <Cell key={cell.key} cell={cell} first={i === 0} />
          ))}
        </Flex>
        <span
          style={{ ...CELL_STYLE, marginLeft: "auto", gap: 6, borderLeft: `1px solid ${t.border}` }}
        >
          build
          {BUILD_SHA ? (
            <a
              href={`${siteConfig.repo}/commit/${BUILD_SHA}`}
              target="_blank"
              rel="noopener"
              title="This build's commit on GitHub"
              className="studio-statusline-link"
              style={{ color: "inherit", textDecorationColor: t.border, textUnderlineOffset: 4 }}
            >
              {BUILD_SHA.slice(0, 7)}
            </a>
          ) : (
            <span>local</span>
          )}
          {BUILT_ON && <span>· {BUILT_ON}</span>}
        </span>
      </Flex>
    </Card>
  )
}

/** Sanity's navbar with the statusline under it (both workspaces). */
export function StudioNavbar(props: NavbarProps) {
  return (
    <>
      {props.renderDefault(props)}
      <Statusline />
    </>
  )
}
