---
name: itsashik.dev
description: A personal site styled as a homelab status dashboard. Monochrome, and colour only ever means status.
colors:
  background: "oklch(0.985 0.002 247)"
  surface: "oklch(1 0 0)"
  surface-2: "oklch(0.967 0.003 265)"
  ink: "oklch(0.21 0.006 286)"
  muted-ink: "oklch(0.48 0.016 286)"
  hairline: "oklch(0.92 0.004 286)"
  hairline-strong: "oklch(0.87 0.006 286)"
  focus-ring: "oklch(0.55 0.17 255)"
  destructive: "oklch(0.55 0.2 25)"
  status-up: "oklch(0.64 0.17 150)"
  status-up-fg: "oklch(0.47 0.13 150)"
  status-up-soft: "oklch(0.96 0.04 150)"
  status-warn: "oklch(0.66 0.16 60)"
  status-warn-fg: "oklch(0.5 0.12 60)"
  status-warn-soft: "oklch(0.965 0.05 85)"
  status-down: "oklch(0.6 0.21 25)"
  status-down-fg: "oklch(0.5 0.19 25)"
  status-down-soft: "oklch(0.96 0.03 20)"
  status-info: "oklch(0.6 0.17 255)"
  status-info-fg: "oklch(0.5 0.17 258)"
  status-info-soft: "oklch(0.96 0.03 255)"
  status-idle: "oklch(0.62 0.01 286)"
  status-idle-fg: "oklch(0.48 0.016 286)"
  status-idle-soft: "oklch(0.955 0.003 286)"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 1.6rem + 3.2vw, 4rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
  metric:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1rem
    letterSpacing: "0.08em"
rounded:
  sm: "2px"
  md: "4px"
  lg: "6px"
  xl: "10px"
  full: "9999px"
spacing:
  gutter: "16px"
  gutter-sm: "24px"
  panel: "16px"
  row-y: "12px"
  section: "64px"
  section-sm: "96px"
  container: "72rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.background}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  panel-header:
    typography: "{typography.label}"
    padding: "8px 16px"
    height: "40px"
  status-pill-up:
    backgroundColor: "{colors.status-up-soft}"
    textColor: "{colors.status-up-fg}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  chip:
    textColor: "{colors.muted-ink}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  chip-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.background}"
    rounded: "{rounded.full}"
  nav-link-active:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
---

# Design System: itsashik.dev

## Overview

**Creative North Star: "The Homelab Status Page"**

The site is presented as the status page of a small, well-run homelab. Projects are **services**, writing is the **incident log**, experience is **uptime**, and skills are the **inventory**. The ink is quiet and the hairlines thin. Every number on the page is real, coming from GitHub sync or the CMS, so the dashboard reads as an instrument rather than a costume.

The UI is monochrome on purpose. Neutral surfaces, near-black (or near-white) ink and 1px hairlines carry the structure. The only colour on the page is status, and the five status colours have fixed meanings. Because colour is that scarce, a single green dot is enough to say "live". Density is moderate, like a tidy admin console: compact rows, small mono labels and generous section breaks, so long-form reading is still comfortable.

The metaphor lives in the data, not the headings. Section titles are plain ("Writing", "Projects"); the dashboard voice appears where a real instrument would put it: panel headers ("services · 6 of 7", "log", "inventory"), status dots backed by data, and the system bar. Actions people need (read, follow, contact) use ordinary words.

**Key Characteristics:**
- Monochrome neutrals with a cool grey cast (hue 286) in both themes; the theme follows the system setting.
- Five status colours (up, warn, down, info, idle), each a triple: dot, text (`-fg`) and tint (`-soft`).
- Geist for words and Geist Mono for labels, metadata and numbers.
- Flat 1px-bordered panels. Only dialogs cast a shadow.
- Live data shown with tabular figures, status dots and muted-ink sparklines. Nothing shows a status it can't measure.

## Colors

A grey, faintly cool monochrome, broken only by five signal colours with fixed meanings.

### Primary
- **Console Ink** (`ink`): text, primary buttons and the active filter chip. Primary actions are inverted ink rather than a hue. In dark mode it becomes near-white (oklch(0.97 0.002 286)).

### Neutral
- **Paper Grey** (`background`): the page itself. Dark: oklch(0.145 0.004 286).
- **Panel White** (`surface`): panels, tiles, the system bar. Dark: oklch(0.18 0.005 286).
- **Rack Grey** (`surface-2`): hover and active backgrounds on rows and nav links, inline code chips, code block backgrounds. Dark: oklch(0.225 0.006 286).
- **Muted Ink** (`muted-ink`): descriptions, metadata, labels, inactive nav. Dark: oklch(0.71 0.012 286).
- **Hairline** (`hairline`) / **Strong Hairline** (`hairline-strong`): every border and divider, and input strokes (`hairline-strong`). The dot-grid backdrop uses `hairline-strong` at 60% opacity.

### Status (the only colour)
- **Up / Live Green** (`status-up`, `-fg`, `-soft`): healthy, live, available. Pulses only on "live" indicators.
- **Warn / Attention Amber** (`status-warn`, …): needs attention, limited availability.
- **Down / Fault Red** (`status-down`, …): errors and failures. `destructive` is the same hue for destructive buttons.
- **Info / Link Blue** (`status-info`, …): links in prose, the focus ring, text selection (28% mix), highlighted code lines.
- **Idle / Standby Grey** (`status-idle`, …): archived, inactive, not looking.

Each status follows one recipe. The dot is at least 3:1 against the surface. The `-fg` text is at least 4.5:1 on its own `-soft` tint and on the surface. `tests/unit/tokens.test.ts` fails the build when any pair drops below that. Dark-theme values are in `app/globals.css` and in the sidecar.

### Named Rules
**The Colour Means Something Rule.** A hue appears only to report a state: up, warn, down, info or idle. No brand colour, no decorative accents, no coloured illustrations of UI.

**The Label Carries It Rule.** Status is never shown by colour alone. A dot comes with a visible label (StatusPill) or a screen-reader label (StatusDot `label`).

**The Neutral Chart Rule.** Data viz uses `ink`, `muted-ink` and `hairline-strong` only. Trends are muted ink and the current value is ink. Status colours are never series colours.

## Typography

**Display Font:** Geist (with ui-sans-serif, system-ui)
**Body Font:** Geist
**Label/Mono Font:** Geist Mono (with ui-monospace, SFMono-Regular, Menlo)

**Character:** a precise, neutral grotesk for reading, with its monospace sibling for anything a machine would print: labels, metadata, build SHAs, counts and filter chips.

### Hierarchy
- **Display** (600, clamp(2.25rem → 4rem), 1.05, -0.035em): the name in the hero only.
- **Headline** (600, 1.5rem → 1.875rem from `sm`, tight tracking, balanced): section titles from SectionHeader.
- **Title** (500, 1rem): row titles in data lists, clamped to one line (two on phones).
- **Metric** (600, 1.5rem, leading 1, tabular figures): numbers in metric tiles and in the hero node panel.
- **Body** (400, 1rem, 1.5; descriptions at 1.125rem in the hero; max-width `prose`, about 65ch): running text and descriptions in muted ink. Blog posts use Tailwind Typography mapped onto these tokens.
- **Label** (400 mono, 0.6875rem, 0.08em tracking, uppercase, muted ink; the `label-caps` utility): panel headers, metadata, dates, the system bar. Never above a heading.

### Named Rules
**The Machine Voice Rule.** Mono is for things a system would print: labels, metadata, measurements, identifiers and filter values. Words people read in sentences are always Geist sans.

**The Tabular Rule.** Every number that can change (counts, stars, commits, dates in rows) uses tabular figures so it doesn't jitter.

**The No Kicker Rule.** Headings stand alone. No mono label sits above an H1 or H2; the dashboard vocabulary belongs in panel headers.

## Layout

There is a single centred column, at most 72rem (`max-w-6xl`), with 16px gutters on phones and 24px from `sm`. Sections stack vertically with 64px of vertical padding (96px from `sm`) and are separated by full-width hairlines (`border-t` / `border-b`), not by background changes. Anchored sections clear the sticky 56px header with `scroll-mt-20`.

The page shell runs top to bottom: a 32px **system bar**, then a sticky **header** at 56px with an 80% background and a backdrop blur, then the sections, then the footer. The system bar reports only measured facts: the GitHub sync's health (a status dot re-judged in the browser against the visitor's clock, so a stale static page can't keep showing green; hidden until the sync has run), the newest post's date, and the build SHA and date from `sm` up. A page may pass one explicit notice (the 404 page says "1 page not found").

The home page reads in priority order: hero, **Writing** (the lead section), Projects, Experience & education, Stack, Contact.

Inside sections, content sits in panels and dense lists. The hero splits 1.35fr / 1fr from `lg` (portrait, name, tagline and actions on the left; the node panel on the right) and stacks on smaller screens, kept short enough that the first section starts within the first phone screen. The contact section splits 1fr / 1.3fr. Metric grids run two columns on phones and four from `sm`. Data rows move metadata under the title on phones and inline on wider screens.

A faint 20px dot grid (`bg-grid`) sits behind the hero only, masked to fade out from the top.

## Elevation & Depth

The system is flat. Depth comes from tone and line: a page background, panels one step lighter (or darker in dark mode) with a 1px hairline, and `surface-2` on hover. The sticky header separates itself with a translucent background, a backdrop blur and a bottom hairline, not a shadow.

### Shadow Vocabulary
- **Dialog** (shadcn default `shadow-lg`): the command palette and other dialogs, which sit above a 55% black scrim.
- **Control hint** (`shadow-xs`): a near-invisible lift on outline buttons and inputs, inherited from shadcn/ui.

### Named Rules
**The Only Dialogs Float Rule.** Dialogs are the only surfaces with a real shadow. Panels, tiles, cards and rows stay flat and rely on hairlines.

## Shapes

Corners are barely rounded and consistent: 2px for inline code chips, 4px for buttons, inputs and nav links, 6px for panels and metric tiles, and 10px for larger overlays. Pills and filter chips are fully rounded, and so are status dots and the avatar. Borders are always 1px hairlines; strong hairlines are for input strokes and emphasis. The portrait is a circle with a 1px hairline ring.

## Components

### Buttons
Shadcn/ui on the monochrome tokens.
- **Shape:** gently rounded (4px), 36px tall (32px small, 40px large), 14px medium text, 16px icon.
- **Primary:** inverted ink: an ink background with background-coloured text, 90% ink on hover. Used once per view at most (the hero's Résumé).
- **Outline:** background fill, a hairline border and a faint `shadow-xs`, with a `surface-2` fill on hover. Used for the secondary action ("Get in touch").
- **Ghost:** no fill until hover (`surface-2`). Used for labelled tertiary actions ("Follow via RSS") and icon buttons (menu, theme).
- **Focus:** the one site-wide style: a solid 2px outline in the focus colour, offset 2px. Inside panels (rows, list links) the offset is -2px so `overflow-hidden` can't clip it.

### Status pill and status dot (signature)
- **Pill:** fully rounded, 2px × 8px padding, a mono 11px uppercase label tracked at 0.06em, a status `-soft` background with `-fg` text, and a 6px dot at the front. The label carries the meaning.
- **Dot:** 8px circle. With `pulse`, it uses `pulse-dot` (2s ease-in-out, scaling to 0.8 at 45% opacity) and only when motion is allowed (`motion-safe`).

### Panel (signature)
- **Corner style:** 6px, with the overflow clipped.
- **Background:** `surface`, a 1px hairline and no shadow.
- **Header:** at least 40px tall, a bottom hairline, padded 8px × 16px, and a `label-caps` title on the left. Right-aligned metadata is also `label-caps` (for example "online" or "secure · turnstile").
- **Body:** 16px padding.

### Data list / service row (signature)
Dense rows divided by hairlines. Each row has an optional status dot (only when the CMS sets one), a medium-weight title that wraps rather than truncates, a one-line muted description capped at about 80 characters, mono metadata, and a right-aligned tabular value or sparkline. Linked rows fill with `surface-2` on hover and focus; rows that leave the site carry an arrow and open in a new tab.

### Writing log (signature)
The home page's lead list. Each entry is one link: a mono date column (7.5rem from `sm`), a semibold 1.125–1.25rem title that is never cut off, an excerpt trimmed on a word boundary (about 160 characters, `text-pretty`), and mono tags. Three entries: featured posts first, then the newest.

### Node panel (signature)
The hero's instrument. Header "node · itsashik", with the availability pill as its status when one is configured (currently off). Below it, only real facts: the latest post (a link), the homelab services from the "Homelab" section of /uses when present, and counts (posts, projects, and commits/yr once the GitHub sync has written them).

### Metric tile
A `label-caps` label above a 1.5rem semibold tabular value, with an optional sparkline at the right and a 12px muted hint. It is built as a description list (`dl` / `dt` / `dd`).

### Sparkline
A 96 × 24 server-rendered SVG in muted ink, with the latest point in ink. It carries a text summary (range and peak) as its accessible name and has no hover layer. On the home page the lines trace in once when the projects panel scrolls into view (700ms, rows 60ms apart, capped at 300ms), then the latest point lands.

### Inventory chips
Skills render as wrapping chips (6px corners, a hairline border, a 24px icon plate, the full name) grouped into four rows: languages & frontend, backend & data, infrastructure & homelab, tools & AI. Eight per group are visible; a checkbox-driven "Show all" reveals the rest through `:has()`, without JavaScript.

### Chips (filters)
Fully rounded, 4px × 10px, mono 12px, with a hairline border. Inactive chips are muted ink and turn ink on hover. Active chips are inverted ink (an ink fill with background-coloured text) and set `aria-pressed`. The first option is always "all".

### Inputs / Fields
4px corners, 36px tall, a strong-hairline stroke, a transparent fill (30% input tint in dark mode) and muted-ink placeholders. Focus shows a 3px ring at 50%. Invalid fields get a destructive border and ring.

### Navigation
The wordmark `itsashik.dev` in mono, with ".dev" in muted ink. Desktop links are 14px muted-ink pills that get a `surface-2` fill on hover and when active (`aria-current="page"`). Hash links are never marked active. On mobile, a ghost menu button opens a full-width panel with 16px links and a theme row. The ⌘K command palette is available on every screen size.

### Section header
A plain-language headline ("Writing", "Get in touch") with no label above it, an optional description up to about 65ch, and optional actions on the right: 14px medium links with an icon (an arrow, or RSS), padded to 44px tall.

### Motion
Motion explains continuity, state or feedback; nothing animates just because it scrolled into view.
- **Feedback:** the mobile menu drops in (200ms) and closes instantly; revealed skill chips fade up in a capped cascade; the contact button spins while sending and the confirmation rises in; a theme switch crossfades (240ms); a re-judged status dot shifts colour over 500ms.
- **Navigation is instant.** Pages swap without transitions; continuity comes from consistent layout, not motion.
- **Reduced motion:** movement goes (no trace, no slides); crossfades shorten and colour changes stay.

### Skeletons
Only where the visitor actually waits: a Microlink link preview (seconds), the Turnstile check in the contact form, and large images without a blur placeholder (tinted `surface-2` until they arrive). A skeleton is `surface-2` with a pulse under `motion-safe`, always paired with text for status ("capturing screenshot…", "Loading spam check…") and a failure message. No route-level `loading.tsx` on detail pages: streaming turns `notFound()` into a 200.

### Index pages
`/post` and `/projects` share one frame: full-width container, an H1 with a one-line description, a "Search posts / Search projects" field with an "N of M posts / projects" count, chip filter rows, then the content (a log panel of rows for posts, a grid of project panels for projects). Empty results use the same panel message.

## Do's and Don'ts

### Do:
- **Do** keep every hue tied to a status. If a new element needs colour, it needs a state first.
- **Do** pair every status dot with a visible or screen-reader label.
- **Do** pull every number from GitHub sync or the CMS and set it in tabular figures.
- **Do** put dashboard vocabulary in panel headers and metadata; keep headings and actions in plain words.
- **Do** hide a status, count or sparkline when its data is missing rather than showing a placeholder value.
- **Do** separate sections and panels with 1px hairlines and tonal steps, not shadows.
- **Do** run `tests/unit/tokens.test.ts` after changing any token. Every text/background pair must stay at WCAG AA in both themes.
- **Do** gate any motion behind `motion-safe` / `prefers-reduced-motion`, and keep content visible by default: animations arm only after hydration.

### Don't:
- **Don't** introduce a brand or accent colour, gradients, or coloured series in charts.
- **Don't** show status by colour alone.
- **Don't** hardcode a healthy state ("operational", "online"). If nothing measures it, it isn't shown.
- **Don't** put a mono label above a heading.
- **Don't** add shadows to panels, tiles, cards or rows. Only dialogs float.
- **Don't** use mono for sentences people read. It is for labels, metadata, identifiers and numbers.
- **Don't** invent metrics, uptime figures or service states. If the CMS has no status for a project, show none.
- **Don't** add scroll reveals, entrance staggers on sections, parallax or count-up numbers.
- **Don't** let the metaphor rename an action into something obscure. "Get in touch" beats "Open a ticket".
