import type { CSSProperties, ReactNode } from "react"
import { useColorSchemeValue } from "sanity"

import type { Status } from "../../lib/status"
import { tokens } from "../theme/tokens.generated"

/**
 * The site's status vocabulary for Studio components (components/dashboard/status-*.tsx on the
 * site). Colours come from the generated tokens for the Studio's current scheme, so a pill reads
 * the same in the CMS as on the page. Status is never colour alone: a dot always comes with a
 * visible word or a screen-reader label.
 */

export const MONO = "var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace"

/** The site's `label-caps`: mono, 11px, tracked, uppercase. For labels and metadata only. */
export const LABEL_CAPS: CSSProperties = {
  fontFamily: MONO,
  fontSize: 11,
  lineHeight: "16px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
}

/** Site tokens (hex) for the Studio's current light/dark scheme. */
export function useSiteTokens() {
  return tokens[useColorSchemeValue() === "dark" ? "dark" : "light"]
}

export function StatusDot({
  status,
  label,
  size = 8,
}: {
  status: Status
  /** Screen-reader label, when no visible word sits next to the dot. */
  label?: string
  size?: number
}) {
  const t = useSiteTokens()
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: 999,
        background: t[`status-${status}`],
        flexShrink: 0,
      }}
    />
  )
}

/** Dot + mono word on the status's soft tint (the site's StatusPill). */
export function StatusPill({ status, children }: { status: Status; children: ReactNode }) {
  const t = useSiteTokens()
  return (
    <span
      style={{
        ...LABEL_CAPS,
        letterSpacing: "0.06em",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 8px",
        borderRadius: 999,
        background: t[`status-${status}-soft`],
        color: t[`status-${status}-fg`],
        whiteSpace: "nowrap",
      }}
    >
      <StatusDot status={status} size={6} />
      {children}
    </span>
  )
}

/** A status word in its -fg colour, for metadata lines (the dot sits beside it). */
export function StatusWord({ status, children }: { status: Status; children: ReactNode }) {
  const t = useSiteTokens()
  return <span style={{ color: t[`status-${status}-fg`] }}>{children}</span>
}

/**
 * A status dot as list-preview media (`preview.prepare` → `media`), labelled for screen readers.
 * Returns a component so it can be used from .ts schema files.
 */
export function statusMedia(status: Status, label: string) {
  function StatusMedia() {
    return (
      <span style={{ display: "grid", placeItems: "center", width: "100%", height: "100%" }}>
        <StatusDot status={status} label={label} />
      </span>
    )
  }
  return StatusMedia
}
