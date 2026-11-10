import { Box, Container, Grid, Stack, Text } from "@sanity/ui"
import { useCurrentUser, type Tool } from "sanity"

import { HomeIcon } from "../components/icons"
import { useSiteTokens } from "../components/status"
import {
  FreshnessWidget,
  GitHubWidget,
  HealthWidget,
  InboxWidget,
  OverviewWidget,
  RecentWidget,
} from "./widgets"

/**
 * Hover and focus for linked rows and tiles: the site's surface-2 fill. Tiles use a stretched
 * link, so they're matched through :has().
 */
const rowHoverCss = (fill: string) => `
a:hover > .studio-dashboard-row, a:focus-visible > .studio-dashboard-row,
.studio-dashboard-row:has(> .studio-dashboard-tile-link:hover),
.studio-dashboard-row:has(> .studio-dashboard-tile-link:focus-visible) {
  background: ${fill} !important;
}
.studio-dashboard-tile-link:focus-visible {
  outline: 2px solid var(--card-focus-ring-color);
  outline-offset: -2px;
}
`

function greeting(hour: number): string {
  if (hour < 5) return "Up late"
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

function Dashboard() {
  const user = useCurrentUser()
  const firstName = user?.name?.split(" ")[0]
  const t = useSiteTokens()

  return (
    <Box padding={[3, 4, 5]} style={{ overflowY: "auto", height: "100%" }}>
      <style>{rowHoverCss(t["surface-2"])}</style>
      <Container width={4}>
        <Stack gap={5}>
          {/* A plain heading: no label above it (the site's No Kicker Rule). */}
          <Text as="h1" size={4} weight="semibold" style={{ letterSpacing: "-0.025em" }}>
            {greeting(new Date().getHours())}
            {firstName ? `, ${firstName}` : ""}
          </Text>
          <OverviewWidget />
          <Grid gridTemplateColumns={[1, 1, 2]} gap={4}>
            <Stack gap={4}>
              <InboxWidget />
              <HealthWidget />
            </Stack>
            <Stack gap={4}>
              <RecentWidget />
              <FreshnessWidget />
              <GitHubWidget />
            </Stack>
          </Grid>
        </Stack>
      </Container>
    </Box>
  )
}

/** Studio home: overview counts, inbox, recently edited, content health and freshness. */
export const dashboardTool: Tool = {
  name: "home",
  title: "Home",
  icon: HomeIcon,
  component: Dashboard,
}
