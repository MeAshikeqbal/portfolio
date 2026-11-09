import { HomeIcon } from "@sanity/icons/Home"
import { Box, Container, Grid, Stack, Text } from "@sanity/ui"
import { useCurrentUser, type Tool } from "sanity"

import { MONO } from "./widget"
import { GitHubWidget, HealthWidget, InboxWidget, OverviewWidget, RecentWidget } from "./widgets"

/** Hover state for clickable rows and tiles (Sanity UI cards have no hover by default). */
const ROW_HOVER_CSS = `
a:hover > .studio-dashboard-row, a:focus-visible > .studio-dashboard-row {
  background: var(--card-muted-bg-color);
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

  return (
    <Box padding={[3, 4, 5]} style={{ overflowY: "auto", height: "100%" }}>
      <style>{ROW_HOVER_CSS}</style>
      <Container width={4}>
        <Stack gap={5}>
          <Stack gap={3}>
            <Text
              size={0}
              muted
              style={{ fontFamily: MONO, letterSpacing: "0.08em", textTransform: "uppercase" }}
            >
              itsashik.dev / studio
            </Text>
            <Text as="h1" size={4} weight="semibold">
              {greeting(new Date().getHours())}
              {firstName ? `, ${firstName}` : ""}
            </Text>
          </Stack>
          <OverviewWidget />
          <Grid gridTemplateColumns={[1, 1, 2]} gap={4}>
            <Stack gap={4}>
              <InboxWidget />
              <HealthWidget />
            </Stack>
            <Stack gap={4}>
              <RecentWidget />
              <GitHubWidget />
            </Stack>
          </Grid>
        </Stack>
      </Container>
    </Box>
  )
}

/** Studio home: overview counts, inbox, recently edited and content health. */
export const dashboardTool: Tool = {
  name: "home",
  title: "Home",
  icon: HomeIcon,
  component: Dashboard,
}
