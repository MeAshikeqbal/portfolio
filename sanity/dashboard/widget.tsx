import { Box, Button, Card, Flex, Spinner, Stack, Text } from "@sanity/ui"
import { Fragment, type ReactNode } from "react"
import { IntentLink, Link } from "sanity/router"

import { sparklinePoints } from "../../components/dashboard/sparkline"
import type { Status } from "../../lib/status"
import { RefreshIcon } from "../components/icons"
import { LABEL_CAPS, MONO, StatusDot, StatusWord, useSiteTokens } from "../components/status"

/**
 * Dashboard primitives in the site's language (DESIGN.md "Panel", "Data list", "Metric tile",
 * "Sparkline"): flat 6px panels with a hairline, label-caps headers, dense rows whose status is a
 * word (with its dot) leading the mono metadata, never a coloured badge alone.
 */

/** A status shown as a dot plus its word, e.g. `{ status: "warn", label: "draft" }`. */
export interface RowStatus {
  status: Status
  label: string
}

export function Widget({
  title,
  meta,
  onRefresh,
  loading,
  error,
  children,
}: {
  title: string
  meta?: ReactNode
  onRefresh?: () => void
  loading?: boolean
  error?: Error
  children: ReactNode
}) {
  const t = useSiteTokens()
  return (
    <Card as="section" radius={3} border style={{ overflow: "hidden" }}>
      <Flex
        align="center"
        justify="space-between"
        gap={3}
        paddingLeft={3}
        paddingRight={2}
        style={{ borderBottom: `1px solid ${t.border}`, minHeight: 40 }}
      >
        <h2 style={{ ...LABEL_CAPS, margin: 0, fontWeight: 400, color: t["muted-foreground"] }}>
          {title}
        </h2>
        <Flex align="center" gap={1}>
          {meta && <span style={{ ...LABEL_CAPS, color: t["muted-foreground"] }}>{meta}</span>}
          {onRefresh && (
            <Button
              icon={RefreshIcon}
              mode="bleed"
              fontSize={1}
              padding={2}
              onClick={onRefresh}
              aria-label={`Refresh ${title}`}
              title="Refresh"
            />
          )}
        </Flex>
      </Flex>
      <Box padding={2}>
        {error ? (
          <Box padding={2}>
            <Text size={1}>
              <StatusWord status="down">Couldn&apos;t load</StatusWord>
              <span style={{ color: t["muted-foreground"] }}>: {error.message}</span>
            </Text>
          </Box>
        ) : loading ? (
          <Box padding={4}>
            <Flex justify="center">
              <Spinner muted />
            </Flex>
          </Box>
        ) : (
          <Stack gap={1}>{children}</Stack>
        )}
      </Box>
    </Card>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <Box padding={2}>
      <Text size={1} muted>
        {children}
      </Text>
    </Box>
  )
}

/**
 * One data row: a medium title and a one-line muted subtitle on the left; on the right the mono
 * metadata, led by the status word (in its -fg colour, dot beside it) when there is one.
 */
export function Row({
  title,
  subtitle,
  status,
  meta,
}: {
  title: ReactNode
  subtitle?: ReactNode
  status?: RowStatus
  meta?: ReactNode
}) {
  const t = useSiteTokens()
  const items = [
    status && (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <StatusDot status={status.status} size={6} />
        <StatusWord status={status.status}>{status.label}</StatusWord>
      </span>
    ),
    meta,
  ].filter(Boolean)

  return (
    <Box padding={2} className="studio-dashboard-row" style={{ borderRadius: 4 }}>
      <Flex align="center" gap={3}>
        <Stack gap={2} flex={1} style={{ minWidth: 0 }}>
          <Text size={1} weight="medium" textOverflow="ellipsis">
            {title}
          </Text>
          {subtitle && (
            <Text size={1} muted textOverflow="ellipsis">
              {subtitle}
            </Text>
          )}
        </Stack>
        {items.length > 0 && (
          <span
            style={{
              ...LABEL_CAPS,
              color: t["muted-foreground"],
              whiteSpace: "nowrap",
              fontVariantNumeric: "tabular-nums",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            {items.map((item, i) => (
              <Fragment key={i}>
                {i > 0 && <span style={{ padding: "0 6px" }}>·</span>}
                {item}
              </Fragment>
            ))}
          </span>
        )}
      </Flex>
    </Box>
  )
}

/** A metric tile (dt/dd): label-caps label, a 1.5rem semibold tabular value, optional trend. */
export function MetricTile({
  label,
  value,
  hint,
  trend,
  href,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  trend?: ReactNode
  /** Studio path the whole tile opens (a stretched link, so dt/dd stay valid). */
  href?: string
}) {
  const t = useSiteTokens()
  return (
    <div
      className="studio-dashboard-row"
      style={{ background: t.surface, padding: 16, height: "100%", position: "relative" }}
    >
      {href && (
        <Link
          href={href}
          aria-label={`Open ${label.toLowerCase()}`}
          className="studio-dashboard-tile-link"
          style={{ position: "absolute", inset: 0, zIndex: 1 }}
        />
      )}
      <dt style={{ ...LABEL_CAPS, color: t["muted-foreground"] }}>{label}</dt>
      <dd style={{ margin: "8px 0 0" }}>
        <Flex align="flex-end" justify="space-between" gap={3}>
          <span
            style={{
              fontSize: 24,
              lineHeight: 1,
              fontWeight: 600,
              letterSpacing: "-0.025em",
              fontVariantNumeric: "tabular-nums",
              color: t.foreground,
            }}
          >
            {value}
          </span>
          {trend}
        </Flex>
        {hint && (
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              lineHeight: "16px",
              color: t["muted-foreground"],
            }}
          >
            {hint}
          </div>
        )}
      </dd>
    </div>
  )
}

/**
 * The site's sparkline: muted-ink trend, latest point in ink, a text summary as its accessible
 * name. Neutral only: status colours are never series colours.
 */
export function Sparkline({
  values,
  label,
  width = 96,
  height = 24,
}: {
  values: readonly number[]
  label: string
  width?: number
  height?: number
}) {
  const t = useSiteTokens()
  if (values.length < 2) return null
  const points = sparklinePoints(values, width, height)
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ")
  const last = points[points.length - 1]
  const summary = `${label}: from ${values[0]} to ${values[values.length - 1]}, peak ${Math.max(...values)}`
  return (
    <svg role="img" aria-label={summary} width={width} height={height} style={{ flexShrink: 0 }}>
      <path
        d={d}
        fill="none"
        stroke={t["muted-foreground"]}
        strokeWidth={1.25}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last.x} cy={last.y} r={2} fill={t.foreground} />
    </svg>
  )
}

const LINK_STYLE = { color: "inherit", textDecoration: "none", display: "block", borderRadius: 4 }

/** Row that opens a document in the current workspace. */
export function DocLink({ id, type, children }: { id: string; type: string; children: ReactNode }) {
  return (
    <IntentLink intent="edit" params={{ id, type }} style={LINK_STYLE}>
      {children}
    </IntentLink>
  )
}

/** Row that links to another Studio URL (e.g. the Inbox workspace), via the Studio router. */
export function HrefLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} style={LINK_STYLE}>
      {children}
    </Link>
  )
}

export { MONO }
