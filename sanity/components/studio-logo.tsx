import { Flex, Text } from "@sanity/ui"
import type { LogoProps } from "sanity"

import { MONO } from "./status"

/**
 * Navbar brand: the site's mono wordmark, ".dev" in muted ink. No status dot: nothing here is
 * measured (the statusline under the navbar carries the real state).
 */
export function StudioLogo(props: LogoProps) {
  return (
    <Flex align="center" paddingX={2} title={props.title}>
      <Text size={1} weight="semibold" style={{ fontFamily: MONO }}>
        itsashik<span style={{ opacity: 0.55 }}>.dev</span>
      </Text>
    </Flex>
  )
}
