import { Box, Button, Text } from "@sanity/ui"
import { useToast } from "@sanity/ui/toast"
import { useEffect, useMemo, useState } from "react"
import { useClient, useWorkspace } from "sanity"
import { Link } from "sanity/router"

import { syncStatus } from "../../lib/status"
import { SyncIcon } from "../components/icons"
import { StatusWord, useSiteTokens } from "../components/status"

import { describeSync, requestGitHubSync } from "../actions/request-github-sync"
import { iconExists } from "../lib/icon-check"
import { inboxDatasetName, inboxMessageHref } from "../inbox/dataset"
import {
  dedupeRecent,
  githubRows,
  publishedId,
  healthIssues,
  monthlyCounts,
  nowFreshness,
  snippet,
  timeAgo,
  TYPE_LABELS,
  type EditedDoc,
  type HealthData,
  type HealthDoc,
} from "./logic"
import {
  GITHUB_QUERY,
  HEALTH_QUERY,
  INBOX_QUERY,
  NOW_FRESHNESS_QUERY,
  OVERVIEW_QUERY,
  RECENT_QUERY,
  type GitHubRow,
  type InboxResult,
  type OverviewResult,
} from "./queries"
import { useStudioQuery } from "./use-studio-query"
import {
  DocLink,
  Empty,
  HrefLink,
  MetricTile,
  Row,
  Sparkline,
  Widget,
  type RowStatus,
} from "./widget"

/** Structure paths (see sanity/structure.ts) for the overview tiles. */
const INBOX_PATH = "/studio/inbox"

const LISTS = {
  posts: "blog;post",
  projects: "portfolio;project",
  skills: "portfolio;skills",
}

export function OverviewWidget() {
  const { basePath } = useWorkspace()
  const t = useSiteTokens()
  const { data, error, loading, refresh } = useStudioQuery<OverviewResult>(OVERVIEW_QUERY)
  const cadence = useMemo(() => monthlyCounts(data?.postDates ?? [], new Date()), [data])
  const list = (path: string) => `${basePath}/structure/${path}`

  return (
    <Widget title="Overview" onRefresh={refresh} loading={loading} error={error}>
      {data && (
        // A flat grid with single hairlines: 1px gaps over a border-coloured background.
        <dl
          style={{
            margin: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))",
            gap: 1,
            background: t.border,
            border: `1px solid ${t.border}`,
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <MetricTile
            label="Posts"
            value={data.posts}
            href={list(LISTS.posts)}
            trend={<Sparkline values={cadence} label="Posts published per month, last 12 months" />}
            hint="per month, last 12"
          />
          <MetricTile label="Projects" value={data.projects} href={list(LISTS.projects)} />
          <MetricTile label="Skills" value={data.skills} href={list(LISTS.skills)} />
          <MetricTile
            label="Drafts"
            value={data.drafts}
            hint={
              data.drafts > 0 ? (
                <StatusWord status="warn">unpublished changes</StatusWord>
              ) : (
                "nothing pending"
              )
            }
          />
        </dl>
      )}
    </Widget>
  )
}

export function InboxWidget() {
  const { data, error, loading, refresh } = useStudioQuery<InboxResult>(INBOX_QUERY, {
    dataset: inboxDatasetName,
  })

  return (
    <Widget
      title="Inbox"
      meta={data ? `${data.unread} unread` : undefined}
      onRefresh={refresh}
      loading={loading}
      error={error}
    >
      {data?.latest.length ? (
        data.latest.map((message) => (
          <HrefLink key={message._id} href={inboxMessageHref(message._id)}>
            <Row
              title={message.name || "Anonymous"}
              subtitle={snippet(message.message)}
              status={message.status === "unread" ? { status: "info", label: "unread" } : undefined}
              meta={timeAgo(message.receivedAt)}
            />
          </HrefLink>
        ))
      ) : (
        <Empty>No messages.</Empty>
      )}
      <Box paddingX={2} paddingTop={2}>
        <Text size={1} weight="medium">
          <Link href={INBOX_PATH}>Open inbox →</Link>
        </Text>
      </Box>
    </Widget>
  )
}

const RECENT_TYPES = Object.keys(TYPE_LABELS)

export function RecentWidget() {
  const { data, error, loading, refresh } = useStudioQuery<EditedDoc[]>(RECENT_QUERY, {
    params: { types: RECENT_TYPES },
  })
  const items = useMemo(() => dedupeRecent(data ?? []), [data])

  return (
    <Widget title="Recently edited" onRefresh={refresh} loading={loading} error={error}>
      {items.length ? (
        items.map((item) => (
          <DocLink key={item.id} id={item.id} type={item.type}>
            <Row
              title={item.title}
              subtitle={TYPE_LABELS[item.type] ?? item.type}
              status={item.draft ? { status: "warn", label: "draft" } : undefined}
              meta={timeAgo(item.updatedAt)}
            />
          </DocLink>
        ))
      ) : (
        <Empty>Nothing edited yet.</Empty>
      )}
    </Widget>
  )
}

type IconDoc = HealthDoc & { icon: string }

/**
 * Asks the site's icon route whether each skill icon exists (`X-Icon-Found`). Icons it can't
 * judge (network error, or a deploy without the header) are not reported.
 */
function useBrokenIcons(skills: IconDoc[] | undefined): IconDoc[] | undefined {
  const [broken, setBroken] = useState<IconDoc[]>()
  const key = JSON.stringify(skills?.map((skill) => skill.icon) ?? null)

  useEffect(() => {
    if (!skills) return
    let cancelled = false
    Promise.all(
      skills.map(async (skill) => ((await iconExists(skill.icon)) === false ? skill : null)),
    ).then((results) => {
      if (!cancelled) setBroken(results.filter((skill): skill is IconDoc => skill !== null))
    })
    return () => {
      cancelled = true
    }
    // `key` tracks the icon names; `skills` is a fresh array on every query result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return broken
}

export function HealthWidget() {
  const { data, error, loading, refresh } = useStudioQuery<HealthData & { skillIcons: IconDoc[] }>(
    HEALTH_QUERY,
  )
  const broken = useBrokenIcons(data?.skillIcons)
  const issues = useMemo(
    () => (data && broken ? healthIssues(data, broken) : undefined),
    [data, broken],
  )

  return (
    <Widget
      title="Content health"
      meta={
        issues ? (
          issues.length ? (
            <StatusWord status="warn">{issues.length} to fix</StatusWord>
          ) : (
            <StatusWord status="up">all good</StatusWord>
          )
        ) : undefined
      }
      onRefresh={refresh}
      loading={loading || (Boolean(data) && !issues)}
      error={error}
    >
      {issues?.length ? (
        issues.map((issue) => (
          <DocLink key={`${issue.id}:${issue.problem}`} id={issue.id} type={issue.type}>
            <Row
              title={issue.title}
              subtitle={issue.problem}
              meta={(TYPE_LABELS[issue.type] ?? issue.type).toLowerCase()}
            />
          </DocLink>
        ))
      ) : (
        <Empty>No problems found.</Empty>
      )}
    </Widget>
  )
}

/** Each project's last sync, judged like the site's statusline (stale after 36h). */
function githubRowStatus(syncedAt: string | null): RowStatus {
  const sync = syncStatus(syncedAt)
  if (!sync) return { status: "idle", label: "not synced" }
  return sync.status === "up"
    ? { status: "up", label: "synced" }
    : { status: "warn", label: "stale" }
}

export function GitHubWidget() {
  const client = useClient({ apiVersion: "2026-11-01" })
  const toast = useToast()
  const [syncing, setSyncing] = useState(false)
  const { data, error, loading, refresh } = useStudioQuery<GitHubRow[]>(GITHUB_QUERY)
  const { rows, ids } = useMemo(() => githubRows(data ?? []), [data])

  async function syncAll() {
    setSyncing(true)
    try {
      const result = await requestGitHubSync(client, ids)
      toast.push({
        status: result.failed.length ? "warning" : "success",
        title: result.failed.length ? "Some projects didn't sync" : "Synced from GitHub",
        description: describeSync(result, rows.length),
      })
    } catch (syncError) {
      toast.push({
        status: "error",
        title: "GitHub sync failed",
        description: syncError instanceof Error ? syncError.message : String(syncError),
      })
    } finally {
      setSyncing(false)
      refresh()
    }
  }

  return (
    <Widget
      title="GitHub sync"
      meta="daily · 03:00 utc"
      onRefresh={refresh}
      loading={loading}
      error={error}
    >
      {rows.length ? (
        rows.map((row) => (
          <DocLink key={row._id} id={publishedId(row._id)} type="project">
            <Row
              title={row.title || "Untitled"}
              subtitle={row.language ?? undefined}
              status={githubRowStatus(row.syncedAt)}
              meta={row.syncedAt ? timeAgo(row.syncedAt) : undefined}
            />
          </DocLink>
        ))
      ) : (
        <Empty>No projects with a GitHub repository.</Empty>
      )}
      {rows.length > 0 && (
        <Box paddingX={2} paddingTop={2}>
          <Button
            icon={SyncIcon}
            text={syncing ? "Syncing…" : "Sync all now"}
            mode="ghost"
            fontSize={1}
            disabled={syncing}
            onClick={syncAll}
          />
        </Box>
      )}
    </Widget>
  )
}

const FRESHNESS_STATUS: Record<"fresh" | "stale" | "unpublished", RowStatus> = {
  fresh: { status: "up", label: "fresh" },
  stale: { status: "warn", label: "stale" },
  unpublished: { status: "idle", label: "unpublished" },
}

/** How long since /now was last updated; turns to a warning once it's stale. */
export function FreshnessWidget() {
  const { data, error, loading, refresh } = useStudioQuery<string | null>(NOW_FRESHNESS_QUERY)
  const freshness = nowFreshness(data)

  return (
    <Widget title="Freshness" onRefresh={refresh} loading={loading} error={error}>
      <DocLink id="now" type="now">
        <Row
          title="Now page"
          subtitle={freshness.label}
          status={FRESHNESS_STATUS[freshness.state]}
        />
      </DocLink>
    </Widget>
  )
}
