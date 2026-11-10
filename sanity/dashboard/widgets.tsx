import { SyncIcon } from "../components/icons"
import { Box, Button, Card, Grid, Stack, Text } from "@sanity/ui"
import { useToast } from "@sanity/ui/toast"
import { useEffect, useMemo, useState } from "react"
import { useClient, useWorkspace } from "sanity"
import { Link } from "sanity/router"

import { describeSync, requestGitHubSync } from "../actions/request-github-sync"
import { iconExists } from "../lib/icon-check"
import { inboxDatasetName, inboxMessageHref } from "../inbox/dataset"
import {
  dedupeRecent,
  githubRows,
  publishedId,
  healthIssues,
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
import { DocLink, Empty, HrefLink, MONO, Row, Widget } from "./widget"

/** Structure paths (see sanity/structure.ts) for the overview tiles. */
const INBOX_PATH = "/studio/inbox"

const LISTS = {
  posts: "blog;post",
  projects: "portfolio;project",
  skills: "portfolio;skills",
}

export function OverviewWidget() {
  const { basePath } = useWorkspace()
  const { data, error, loading, refresh } = useStudioQuery<OverviewResult>(OVERVIEW_QUERY)

  const tiles: { label: string; value?: number; path?: string; tone?: "caution" }[] = [
    { label: "Posts", value: data?.posts, path: LISTS.posts },
    { label: "Projects", value: data?.projects, path: LISTS.projects },
    { label: "Skills", value: data?.skills, path: LISTS.skills },
    {
      label: "Unpublished drafts",
      value: data?.drafts,
      tone: data?.drafts ? "caution" : undefined,
    },
  ]

  return (
    <Widget title="Overview" onRefresh={refresh} loading={loading} error={error}>
      <Grid gridTemplateColumns={[2, 2, 4]} gap={2}>
        {tiles.map((tile) => {
          const body = (
            <Card
              padding={3}
              radius={2}
              border
              tone={tile.tone ?? "default"}
              className="studio-dashboard-row"
            >
              <Stack gap={3}>
                <Text
                  size={4}
                  weight="semibold"
                  style={{ fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}
                >
                  {tile.value ?? "–"}
                </Text>
                <Text size={1} muted>
                  {tile.label}
                </Text>
              </Stack>
            </Card>
          )
          return tile.path ? (
            <Link
              key={tile.label}
              href={`${basePath}/structure/${tile.path}`}
              style={{ color: "inherit", textDecoration: "none" }}
            >
              {body}
            </Link>
          ) : (
            <Box key={tile.label}>{body}</Box>
          )
        })}
      </Grid>
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
              badge={message.status === "unread" ? { label: "New", tone: "primary" } : undefined}
              meta={timeAgo(message.receivedAt)}
            />
          </HrefLink>
        ))
      ) : (
        <Empty>No messages.</Empty>
      )}
      <Box paddingX={2} paddingTop={2}>
        <Text size={1}>
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
              badge={item.draft ? { label: "Draft", tone: "caution" } : undefined}
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
      meta={issues ? (issues.length ? `${issues.length} to fix` : "all good") : undefined}
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
              badge={{ label: TYPE_LABELS[issue.type] ?? issue.type, tone: "default" }}
            />
          </DocLink>
        ))
      ) : (
        <Empty>No problems found.</Empty>
      )}
    </Widget>
  )
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
      meta="daily at 03:00 UTC"
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
              meta={row.syncedAt ? `synced ${timeAgo(row.syncedAt)}` : "not synced yet"}
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

const FRESHNESS_BADGE = {
  fresh: { label: "Fresh", tone: "positive" },
  stale: { label: "Stale", tone: "caution" },
  unpublished: { label: "Unpublished", tone: "default" },
} as const

/** How long since /now was last updated; turns to a warning once it's stale. */
export function FreshnessWidget() {
  const { data, error, loading, refresh } = useStudioQuery<string | null>(NOW_FRESHNESS_QUERY)
  const freshness = nowFreshness(data)

  return (
    <Widget title="Freshness" onRefresh={refresh} loading={loading} error={error}>
      <DocLink id="now" type="now">
        <Row title="Now page" subtitle={freshness.label} badge={FRESHNESS_BADGE[freshness.state]} />
      </DocLink>
    </Widget>
  )
}
