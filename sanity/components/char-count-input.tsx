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
const VISUALLY_HIDDEN = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
} as const

export function withCharCount(limit: number): ComponentType<StringInputProps | TextInputProps> {
  function CharCountInput(props: StringInputProps | TextInputProps) {
    const t = useSiteTokens()
    // Raw length, exactly what the paired `rule.max(limit).warning()` measures.
    const length = (props.value ?? "").length
    const over = length > limit
    const count = `${length} / ${limit}`
    return (
      <Stack gap={2}>
        {props.renderDefault(props)}
        <Flex justify="flex-end">
          <span
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
          {/* Announces only crossing the limit, not every keystroke. */}
          <span aria-live="polite" style={VISUALLY_HIDDEN}>
            {over ? `Over ${limit} characters: the site will trim this.` : ""}
          </span>
        </Flex>
      </Stack>
    )
  }
  CharCountInput.displayName = `CharCountInput(${limit})`
  return CharCountInput
}
