import { Flex, Stack } from "@sanity/ui"
import type { ComponentType } from "react"
import type { StringInputProps, TextInputProps } from "sanity"

import { LABEL_CAPS, StatusWord, useSiteTokens } from "./status"

/**
 * A string or text input with a live character counter ("72 / 80") under it, in muted mono, that
 * turns into a warn word past the limit. The limit is where the site trims or clamps the copy
 * (see COPY_LIMITS); pair it with a `.warning()` rule, never an error, so long copy can still be
 * published.
 */
export function withCharCount(limit: number): ComponentType<StringInputProps | TextInputProps> {
  function CharCountInput(props: StringInputProps | TextInputProps) {
    const t = useSiteTokens()
    const length = (props.value ?? "").replace(/\s+/g, " ").trim().length
    const over = length > limit
    const count = `${length} / ${limit}`
    return (
      <Stack gap={2}>
        {props.renderDefault(props)}
        <Flex justify="flex-end">
          <span
            aria-live="polite"
            style={{
              ...LABEL_CAPS,
              textTransform: "none",
              letterSpacing: "0.02em",
              fontVariantNumeric: "tabular-nums",
              color: t["muted-foreground"],
            }}
          >
            {over ? <StatusWord status="warn">{count} · will be trimmed</StatusWord> : count}
          </span>
        </Flex>
      </Stack>
    )
  }
  CharCountInput.displayName = `CharCountInput(${limit})`
  return CharCountInput
}
