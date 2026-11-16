import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"
import type { ReactElement, ReactNode } from "react"
import { localeInfo, type Locale, type LocaleInfo } from "@/i18n/locales"
import { siteConfig } from "@/lib/site"
import type { Status } from "@/lib/status"
import { urlFor } from "@/sanity/lib/image"

/**
 * Shared frame for generated Open Graph images (`opengraph-image.tsx` routes).
 * Satori can't read CSS variables, so colours are the hex values of the dark-theme tokens
 * in app/globals.css (tests/unit/og.test.ts fails if they drift).
 */
export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = "image/png"

export const OG_COLORS = {
  background: "#0a0a0c",
  surface: "#111114",
  foreground: "#f5f5f6",
  muted: "#a0a1a9",
  border: "#262629",
  surface2: "#1b1b1e",
  up: "#3cc96a",
  warn: "#f5af20",
  down: "#fc5855",
  info: "#53a3f2",
  idle: "#7f7f86",
} as const

/** The dot colour for each status, as on the site. */
export const OG_STATUS_COLORS: Record<Status, string> = {
  up: OG_COLORS.up,
  warn: OG_COLORS.warn,
  down: OG_COLORS.down,
  info: OG_COLORS.info,
  idle: OG_COLORS.idle,
}

type OgFont = {
  name: string
  data: ArrayBuffer | Buffer
  weight: 400 | 600
  style: "normal"
}

/**
 * Fonts for Satori: Geist (OFL-licensed, vendored in assets/fonts), plus, for a locale in a
 * script Geist lacks, its Noto font cut down to the characters in `texts` (pass every string
 * the image draws, or anything containing them). Satori falls back to it for glyphs Geist
 * doesn't have, so Latin text and digits keep Geist's shapes.
 */
export async function ogFonts(locale: Locale = "en", ...texts: unknown[]): Promise<OgFont[]> {
  const dir = join(process.cwd(), "assets/fonts")
  const [regular, semibold, mono] = await Promise.all([
    readFile(join(dir, "Geist-Regular.ttf")),
    readFile(join(dir, "Geist-SemiBold.ttf")),
    readFile(join(dir, "GeistMono-Regular.ttf")),
  ])
  const fonts: OgFont[] = [
    { name: "Geist", data: regular, weight: 400, style: "normal" },
    { name: "Geist", data: semibold, weight: 600, style: "normal" },
    { name: "Geist Mono", data: mono, weight: 400, style: "normal" },
  ]
  const script = localeInfo[locale]?.script
  if (!script) return fonts
  const chars = scriptCharacters(texts)
  if (!chars) return fonts
  const family = SCRIPT_FAMILIES[script]
  const weights = await Promise.all(([400, 600] as const).map((w) => googleFont(family, w, chars)))
  weights.forEach((data, i) => {
    if (data) fonts.push({ name: family, data, weight: i === 0 ? 400 : 600, style: "normal" })
  })
  return fonts
}

const SCRIPT_FAMILIES: Record<NonNullable<LocaleInfo["script"]>, string> = {
  devanagari: "Noto Sans Devanagari",
  bengali: "Noto Sans Bengali",
  japanese: "Noto Sans JP",
}

/**
 * Whether Geist lacks the character: anything past Latin Extended, except general punctuation
 * (· — … → °), which Geist draws and which should keep its spacing.
 */
function needsScriptFont(char: string): boolean {
  const code = char.codePointAt(0)!
  return code > 0x24f && !(code >= 0x2000 && code <= 0x21ff)
}

/** The distinct characters Geist can't draw in everything the image draws (strings anywhere). */
export function scriptCharacters(texts: unknown[]): string {
  const chars = new Set<string>()
  const visited = new WeakSet<object>()
  const visit = (value: unknown) => {
    if (typeof value === "string") {
      for (const char of value) if (needsScriptFont(char)) chars.add(char)
    } else if (value && typeof value === "object" && !visited.has(value)) {
      visited.add(value)
      // A React element's text is in its props; skip React's internal fields (_owner, _store).
      for (const [key, child] of Object.entries(value)) if (!key.startsWith("_")) visit(child)
    }
  }
  texts.forEach(visit)
  return [...chars].sort().join("")
}

/**
 * One weight of a Google font, subset to `text` (the CSS API's text= parameter), as TrueType for
 * Satori. Fetched at build or revalidation, like next/font. Null when it can't be had: the image
 * still renders, with boxes for the missing glyphs, and the log says why.
 */
async function googleFont(
  family: string,
  weight: number,
  text: string,
): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`,
        { signal: AbortSignal.timeout(10_000) },
      )
    ).text()
    const src = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1]
    if (!src) throw new Error("no TrueType source in the CSS")
    const font = await fetch(src, { signal: AbortSignal.timeout(10_000) })
    if (!font.ok) throw new Error(`font ${font.status}`)
    return await font.arrayBuffer()
  } catch (error) {
    console.warn(`OG image: couldn't load ${family} ${weight}:`, error)
    return null
  }
}

type OgFonts = Awaited<ReturnType<typeof ogFonts>>

/** An Open Graph card in the page's language, with the script font its text needs. */
export async function ogResponse(element: ReactElement, locale: Locale) {
  return new ImageResponse(element, { ...OG_SIZE, fonts: await ogFonts(locale, element) })
}

/** A social image set in a document's SEO settings, cropped to the card size. */
export function sanityOgImage(image: Parameters<typeof urlFor>[0], fonts: OgFonts) {
  return new ImageResponse(
    // Satori renders plain <img> only; next/image doesn't apply inside an ImageResponse.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={urlFor(image).width(OG_SIZE.width).height(OG_SIZE.height).url()}
      width={OG_SIZE.width}
      height={OG_SIZE.height}
      alt=""
    />,
    { ...OG_SIZE, fonts },
  )
}

/** Trims to `max` characters on a word boundary, adding an ellipsis. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).trimEnd()}…`
}

interface OgFrameProps {
  /** Mono caps line above the title, e.g. "writing · Mar 10, 2026". */
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
        {/* A status dot only when the card reports one; nothing is claimed by default. */}
        {status ? (
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Dot color={status.color} />
            {status.label}
          </span>
        ) : (
          <span>itsashik.dev</span>
        )}
        {status ? <span>itsashik.dev</span> : <span />}
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

export function Bar({ children, bottom = false }: { children: ReactNode; bottom?: boolean }) {
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

export function Mono({
  children,
  size,
  color,
}: {
  children: ReactNode
  size: number
  color: string
}) {
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

export function Dot({ color }: { color: string }) {
  return <div style={{ width: 14, height: 14, borderRadius: 999, background: color }} />
}
