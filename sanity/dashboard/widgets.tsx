import { Box, Card, Grid, Stack, Text } from "@sanity/ui"
import { useEffect, useMemo, useState } from "react"
import { useWorkspace } from "sanity"
import { Link } from "sanity/router"

import { iconUrl } from "../../lib/icons"
import { inboxDatasetName, inboxMessageHref } from "../inbox/dataset"
import {
  dedupeRecent,
  healthIssues,
  snippet,
  timeAgo,
  TYPE_LABELS,
  type EditedDoc,
  type HealthData,
  type HealthDoc,
} from "./logic"
import {
  HEALTH_QUERY,
  INBOX_QUERY,
  OVERVIEW_QUERY,
  RECENT_QUERY,
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
      skills.map(async (skill) => {
        const url = iconUrl(skill.icon)
        if (!url) return skill
        try {
          const response = await fetch(url, { method: "HEAD" })
          return response.headers.get("x-icon-found") === "0" ? skill : null
        } catch {
          return null
        }
      }),
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
