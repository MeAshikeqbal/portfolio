import { Box, Flex, Text } from "@sanity/ui"
import type { LogoProps } from "sanity"

/** Navbar brand: the site's mono wordmark with a live status dot. */
export function StudioLogo(props: LogoProps) {
  return (
    <Flex align="center" gap={2} paddingX={2} title={props.title}>
      <Box
        style={{ width: 8, height: 8, borderRadius: 999, background: "#2fa85a", flexShrink: 0 }}
        aria-hidden
      />
      <Text size={1} weight="semibold" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
        itsashik<span style={{ opacity: 0.55 }}>.dev</span>
      </Text>
    </Flex>
  )
}
