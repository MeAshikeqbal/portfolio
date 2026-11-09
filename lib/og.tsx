import { readFile } from "node:fs/promises"
import { join } from "node:path"
import type { ReactNode } from "react"
import { siteConfig } from "@/lib/site"

/**
 * Shared frame for generated Open Graph images (`opengraph-image.tsx` routes).
 * Satori can't read CSS variables, so colours are the hex values of the dark-theme tokens
 * in app/globals.css (recompute them if those tokens change).
 */
export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = "image/png"

export const OG_COLORS = {
  background: "#0a0a0c",
  surface: "#111114",
  foreground: "#f5f5f6",
  muted: "#a0a1a9",
  border: "#262629",
  up: "#3cc96a",
  info: "#53a3f2",
  idle: "#7f7f86",
} as const

/** Geist (OFL-licensed, vendored in assets/fonts) loaded for Satori. */
export async function ogFonts() {
  const dir = join(process.cwd(), "assets/fonts")
  const [regular, semibold, mono] = await Promise.all([
    readFile(join(dir, "Geist-Regular.ttf")),
    readFile(join(dir, "Geist-SemiBold.ttf")),
    readFile(join(dir, "GeistMono-Regular.ttf")),
  ])
  return [
    { name: "Geist", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Geist", data: semibold, weight: 600 as const, style: "normal" as const },
    { name: "Geist Mono", data: mono, weight: 400 as const, style: "normal" as const },
  ]
}

/** Trims to `max` characters on a word boundary, adding an ellipsis. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).trimEnd()}…`
}

interface OgFrameProps {
  /** Mono caps line above the title, e.g. "incident log · Mar 10, 2026". */
  eyebrow: string
  title: string
  description?: string | null
  /** Mono caps items along the bottom-left, e.g. tags or metrics. */
  footer?: string[]
  status?: { color: string; label: string }
}

/** The dashboard-style card: status bar, eyebrow, big title, description and a footer row. */
export function OgFrame({ eyebrow, title, description, footer = [], status }: OgFrameProps) {
  const titleSize = title.length > 70 ? 56 : title.length > 40 ? 64 : 76

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: OG_COLORS.background,
        color: OG_COLORS.foreground,
        fontFamily: "Geist",
        padding: 0,
      }}
    >
      <Bar>
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Dot color={status?.color ?? OG_COLORS.up} />
          {status?.label ?? "all systems operational"}
        </span>
        <span>itsashik.dev</span>
      </Bar>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 72px",
        }}
      >
        <Mono size={22} color={OG_COLORS.muted}>
          {eyebrow}
        </Mono>
        <div
          style={{
            marginTop: 20,
            fontSize: titleSize,
            fontWeight: 600,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            maxWidth: 1000,
          }}
        >
          {truncate(title, 110)}
        </div>
        {description && (
          <div
            style={{
              marginTop: 24,
              fontSize: 28,
              lineHeight: 1.35,
              color: OG_COLORS.muted,
              maxWidth: 940,
            }}
          >
            {truncate(description, 150)}
          </div>
        )}
      </div>

      <Bar bottom>
        <span style={{ display: "flex", gap: 28 }}>
          {footer.slice(0, 4).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </span>
        <span>{siteConfig.name}</span>
      </Bar>
    </div>
  )
}

function Bar({ children, bottom = false }: { children: ReactNode; bottom?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 72,
        padding: "0 72px",
        background: OG_COLORS.surface,
        borderTop: bottom ? `1px solid ${OG_COLORS.border}` : "none",
        borderBottom: bottom ? "none" : `1px solid ${OG_COLORS.border}`,
        fontFamily: "Geist Mono",
        fontSize: 20,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: OG_COLORS.muted,
      }}
    >
      {children}
    </div>
  )
}

function Mono({ children, size, color }: { children: ReactNode; size: number; color: string }) {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: "Geist Mono",
        fontSize: size,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color,
      }}
    >
      {children}
    </div>
  )
}

function Dot({ color }: { color: string }) {
  return <div style={{ width: 14, height: 14, borderRadius: 999, background: color }} />
}
