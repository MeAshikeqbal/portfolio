import { Badge, Box, Button, Card, Flex, Spinner, Stack, Text } from "@sanity/ui"
import { RefreshIcon } from "@sanity/icons/Refresh"
import type { ReactNode } from "react"
import { IntentLink, Link } from "sanity/router"

const MONO = "var(--font-geist-mono), ui-monospace, monospace"

/** Shared panel chrome for dashboard widgets: mono caps title, optional meta and refresh. */
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
  return (
    <Card radius={3} border style={{ overflow: "hidden" }}>
      <Flex
        align="center"
        justify="space-between"
        paddingX={3}
        paddingY={2}
        style={{ borderBottom: "1px solid var(--card-border-color)", minHeight: 41 }}
      >
        <Text
          as="h2"
          size={0}
          muted
          weight="medium"
          style={{ fontFamily: MONO, letterSpacing: "0.08em", textTransform: "uppercase" }}
        >
          {title}
        </Text>
        <Flex align="center" gap={2}>
          {meta && (
            <Text size={0} muted style={{ fontFamily: MONO }}>
              {meta}
            </Text>
          )}
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
            <Text size={1} style={{ color: "var(--card-badge-critical-dot-color)" }}>
              Couldn&apos;t load: {error.message}
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

/** One list row: primary text, secondary line, optional badge and right-aligned meta. */
export function Row({
  title,
  subtitle,
  badge,
  meta,
}: {
  title: ReactNode
  subtitle?: ReactNode
  badge?: { label: string; tone: "primary" | "positive" | "caution" | "critical" | "default" }
  meta?: ReactNode
}) {
  return (
    <Card padding={2} radius={2} tone="inherit" className="studio-dashboard-row">
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
        {badge && (
          <Badge tone={badge.tone} fontSize={0}>
            {badge.label}
          </Badge>
        )}
        {meta && (
          <Text size={0} muted style={{ fontFamily: MONO, whiteSpace: "nowrap" }}>
            {meta}
          </Text>
        )}
      </Flex>
    </Card>
  )
}

const LINK_STYLE = { color: "inherit", textDecoration: "none", display: "block", borderRadius: 6 }

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
