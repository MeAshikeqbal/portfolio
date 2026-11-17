# itsashik.dev

Portfolio and blog of **Ashik Eqbal**, styled as a homelab status dashboard: a monochrome UI where
colour only ever means status (green = live, amber = attention, red = down, blue = link/info).

**Live:** [www.itsashik.dev](https://www.itsashik.dev) · **Style guide:** `/styleguide` (preview and local builds only)

## Stack

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router, static prerendering), React 19, TypeScript |
| Content | Sanity 6 with the Studio embedded at `/studio`, typed GROQ via TypeGen, Live Content API |
| Styling | Tailwind CSS 4 (CSS-first tokens in `app/globals.css`), shadcn/ui on Radix, Geist |
| Code highlighting | Shiki, rendered on the server |
| Share images | `next/og` (`opengraph-image.tsx` routes) |
| Tests | Vitest + Testing Library, Playwright + axe |
| Hosting | Vercel (Analytics, Speed Insights, Cron) |

## Getting started

```bash
nvm use               # Node 24 (see .nvmrc)
npm ci
cp .env.example .env.local   # fill in values; the public Sanity id is prefilled
npm run dev           # http://localhost:3000, Studio at /studio
```

Without the server-side secrets the site still builds and renders. The contact form, GitHub
sync and webhook just report that they aren't configured.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack); Studio at `/studio` (workspaces `content` and `inbox`) |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run check` | Lint + typecheck + unit tests |
| `npm run lint` · `npm run typecheck` · `npm test` | Individually |
| `npm run format` · `npm run format:check` | Prettier (with Tailwind class sorting) |
| `npm run test:e2e` | Playwright against a production build (`npm run build` first) |
| `npm run typegen` | Regenerate `sanity.types.ts` after changing a schema or a query |
| `npm run backup` | Export the `production` and `inbox` datasets (with assets) into `backups/` (git-ignored). Needs `npx sanity login` |

## Project layout

```
app/
  [lang]/            root layout per language (html lang, fonts, messages)
    (site)/          public site: home, /post, /post/[slug], /projects, /projects/[slug]…
    styleguide/      living style guide (404 in production)
    opengraph-image.tsx
  studio/            embedded Sanity Studio (its own root layout)
  api/               sanity-webhook (revalidation), sync-github-data (cron), github-sync (Studio)
  icons/             self-hosted Iconify SVGs for the skills inventory
  global-not-found.tsx, sitemap.ts, robots.ts, manifest.ts, rss.xml/
i18n/                locales, routing, request config (next-intl)
messages/            UI text per language; en.json is the source
proxy.ts             locale routing
components/
  dashboard/         design-system primitives (StatusPill, Panel, DataRow, Sparkline…)
  home/ blog/ projects/ site/ portable-text/ seo/
  ui/                shadcn/ui components
lib/                 data access (api.ts), helpers, structured data, OG frame
sanity/              schema types, GROQ queries, clients; Studio dashboard, actions, inputs
scripts/             one-off data migrations (dry run by default) and the backup script
tests/unit, tests/e2e
```

## How things work

- **Languages.** UI text lives in `messages/en.json` (ICU syntax) and is read with next-intl's
  `useTranslations` / `getTranslations`; keys are type-checked against `en.json`. English URLs
  stay unprefixed (`/post/foo`); other locales get a prefix (`/hi/post/foo`) once they are listed
  in `i18n/locales.ts`. `proxy.ts` rewrites unprefixed URLs to the English tree and redirects
  `/en/...` to them; files (`rss.xml`, `resume.pdf`…), `/api` and the Studio are left alone.
  Internal links use `Link` from `i18n/navigation.ts` (or `SiteLink`, which keeps files
  unprefixed). Dates and numbers go through `lib/format.ts` with the page's locale.
- **Translations.** `npm run i18n:translate` machine-translates new and changed English messages
  with Google Cloud Translation (`GOOGLE_TRANSLATE_API_KEY`) into `messages/<locale>.json`,
  keeping ICU arguments, plurals and tags intact; `--dry-run` shows what it would send. Hand
  fixes go in `messages/overrides/<locale>.json` and always win. `messages/.lock.json` records
  which English each translation came from, and `tests/unit/messages.test.ts` fails when a
  served locale is missing keys or is stale.
- **Content translations.** On publish, the Sanity webhook (after responding) machine-translates
  posts, projects, /now, Homecave, experience, education and categories into every served
  language and stores each copy as a `translation` document (`translation-<lang>-<id>`, listed
  under *Translations* in the Studio). Queries read each field from it when it exists and fall
  back to English otherwise; a page without a translation says so, marks its text `lang="en"`
  and canonicalizes to the English URL. Only changed text is re-sent (each copy keeps a memory
  of translated segments), and ticking *Edited by hand* protects a corrected copy. Code blocks,
  slugs, URLs, tech tags, company names, homelab machine names and GitHub READMEs are never
  translated. Backfill or redo with
  `npx sanity exec scripts/translate-content.ts --with-user-token` (dry run; add `-- --execute`).

- **Content and freshness.** Every read goes through `sanityFetch` (`lib/api.ts`). Pages are
  static. `<SanityLive />` revalidates them when content is published, and the Sanity webhook
  (`/api/sanity-webhook`) is the backstop for changes made while nobody is on the site.
- **Typed queries.** All GROQ lives in `sanity/lib/queries.ts`. After editing a query or a
  schema, run `npm run typegen`.
- **GitHub stats.** `/api/sync-github-data` runs daily (`vercel.json`). It updates stars,
  language, last push and past-year commit activity (including a 12-week series for the
  sparklines) on every project with a repo, plus the repo's README, which the project page shows
  below the case study (sanitized, GitHub-hosted images only, starter READMEs hidden; **Show
  README** in the project's GitHub tab turns it off). New repositories are not added
  automatically. In the Studio, **Sync from GitHub** (a project's ⋯ menu) or **Sync all now**
  (Home dashboard) runs it on demand: the Studio stamps `githubSyncRequestedAt` with the
  editor's own permissions and `/api/github-sync` only syncs freshly stamped projects, so no
  secret ever reaches the browser.
- **Design tokens.** Colours are OKLCH tokens in `app/globals.css`.
  `tests/unit/tokens.test.ts` fails the build if any text/background pair drops below WCAG AA.
- **Contact messages.** The form stores each message in a **private** `inbox` dataset, shown in
  the Studio as the *Inbox* workspace (`/studio/inbox`, Unread / Read / Archived). Messages
  never go to the public `production` dataset.
- **Security.** `next.config.ts` sends HSTS, `nosniff`, a referrer policy, a permissions policy
  and a Content Security Policy. The CSP applies to production builds only and doesn't cover
  the Studio. `tests/e2e/security.spec.ts` fails on any CSP violation.

## Content tips (Sanity Studio)

- **Project `status`** (active / maintained / archived) turns on status pills. Nothing is
  claimed until it's set.
- **Project `featured`** and the drag-and-drop order of the *Projects* list decide what leads
  the home page (skills follow the order of the *Skills* list). Adding `tech` and a
  case-study `body` fills `/projects/[slug]` and the filters. A **Demo video** (Overview tab)
  replaces the cover at the top of the project page.
- **`excerpt`** and the **SEO** fields (title, description, social image, noindex) override
  the generated defaults for posts and projects.
- **Skill icons** are [Iconify](https://icon-sets.iconify.design) names (`logos:aws`,
  `mdi:security`) from the `logos`, `mdi`, `simple-icons` and `ri` sets. The icon field has a
  search and warns when a name doesn't exist.
- **Rich text** has code blocks (language, filename, highlighted lines), note/warning
  callouts, videos, numbered lists and inline code. `/styleguide` shows every block type.
- **Videos** (demo video or a block in any case study or post) are either an upload (MP4/WebM
  on Sanity's CDN; keep clips short, every view counts against Sanity bandwidth; "Play like a
  GIF" loops them muted) or a YouTube link, which loads the youtube-nocookie player only when
  played. RSS readers get a link instead.
- **Open on site** (⋯ menu) opens a published post, project, Homecave or `/now` in a new tab.
- **Homecave** (`/homecave`, formerly `/uses`, which now redirects) is the live homelab
  dashboard. Each Proxmox node's agent (`scripts/lab-heartbeat/`) posts a signed, anonymized
  report every 30s to `/api/lab-heartbeat`. Reports are stored in Upstash: the latest per node,
  plus 24h of 5-minute samples, one Lua `EVAL` per write. `/api/lab-status` serves them,
  re-allowlisted. The page is server-rendered every 30s and kept fresh in the browser.
  - A root collector on each node (`collect.py`, every 60s, local only) adds what the
    read-only token can't see: named public services up/down (badges on the self-hosted and
    network rows), container health, temperatures, GPU, scrubs, backups, WAN, edge traffic,
    DNS and media savings, all reduced to public names and counts before the sender signs them.
  - Its copy comes from the *Homecave* singleton (Sanity type `uses`): the intro; the
    "Homelab" rows, whose names match the lab's public node names and whose descriptions
    become the node spec lines; and the self-hosted and setup sections.
  - The hero's *homelab* list shows the first five Homelab rows, with measured badges.
  - **Reliability** (below the dashboard): 90-day uptime bars per machine, service and the
    internet line; a **log** of incidents (state changes and silent gaps, recorded by the same
    heartbeat `EVAL`); and a **changelog** of deliberate changes (Studio: *Personal Info → Lab
    changelog*). A post's **Writes up a lab incident** date (Meta tab) links the matching
    incident to it. Optional phone alerts via ntfy (`NTFY_TOPIC`) and healthchecks.io dead-man
    pings are described in `scripts/lab-heartbeat/README.md`.
  - **Snapshot** (button by the verdict) saves `/homecave/snapshot`, a PNG of the lab right
    now, rendered with `next/og` from the same public status and CDN-cached for 30s.
  - Env vars: `LAB_HEARTBEAT_SECRET`, plus Upstash (`UPSTASH_REDIS_REST_*` or `KV_REST_API_*`).
- **PGP.** One key (`siteConfig.pgpFingerprint`) signs the footer's identity statement
  (`/identity.asc`), `/.well-known/security.txt` (RFC 9116; signed for a year), and every
  post: `/post/<slug>.md` is the English original as Markdown (`lib/post-markdown.ts`) and
  `/post/<slug>.md.asc` its detached signature, shown on the post only while it covers the
  current text. Run **`npm run sign`** on the machine with the secret key after changing the
  identity or security.txt fields, after publishing or editing posts, and yearly for
  security.txt; unit tests fail while the repo's copies are stale. Post signatures live in
  Sanity (`postSignature`, written by the script, hidden from the Studio). The key is also
  published by WKD (`gpg --locate-keys hello@itsashik.dev`), which needs the
  `openpgpkey.itsashik.dev` CNAME (DNS only) pointing at this Vercel project.
- **Plain text.** `curl -L itsashik.dev` (also wget, HTTPie, xh) gets the site as 80-column
  text: home, `/post`, `/post/<slug>` (the Markdown), `/projects[/<slug>]`, `/homecave` (live),
  `/now` and `/resume`. `proxy.ts` rewrites those clients to `app/api/text`; browsers and
  anything asking for HTML are untouched. `/llms.txt` (llmstxt.org) and `/llms-full.txt` (every
  post's Markdown) are for tools that read sites on someone's behalf. `/resume.md` is a résumé
  generated from the Studio's experience, education, projects, skills and posts
  (`lib/resume.ts`), and so is `/resume.pdf` (`lib/resume-pdf.tsx`, Geist, A4, refreshed with
  the content and at least hourly). The PDF uploaded in the Studio's *CV* document is only a
  fallback if drawing ever fails. Fill in each job's description in the Studio: the résumé
  prints exactly what's there.
- **`/now`** is a singleton under *Personal Info*. It stays a 404, and isn't linked from the
  footer, ⌘K palette or sitemap, until it has published content. It turns its date pill amber
  once it hasn't been edited for `siteConfig.nowStaleAfterDays`.
- **Content seeds stay local.** Sanity is the source of truth for content. The one-off seed
  and migration scripts (Homecave and `/now` copy, the project refresh, curation) are
  git-ignored, because this repo is public: they live only on the owner's machine and run with
  `npx sanity exec scripts/<name>.ts --with-user-token` (dry run first).
- **E2E and publication state.** Tests expect `ABOUT_PAGES=published|unpublished` (whether
  `/now` is live), decided before the build by `export $(node scripts/about-state.mjs)`
  (uncached Sanity API). CI does this automatically and picks `lighthouserc.published.json`
  once `/now` is live. Homecave is always audited.
- **Draft previews.** Open *Presentation* in the Studio to edit with a live preview of the
  real site, drafts included. This needs `SANITY_API_READ_TOKEN` (a Viewer token).
- **Availability badge.** The hero badge comes from `siteConfig.availability` in `lib/site.ts`:
  change the label, use `status: "warn"` for limited availability, or set it to `null` to hide it.

## Deployment checklist (Vercel)

1. Set the environment variables from `.env.example` (Production and Preview). For draft
   previews, create a **Viewer** token at sanity.io/manage → API → Tokens and set it as
   `SANITY_API_READ_TOKEN`.
2. In sanity.io/manage → API:
   - add `https://www.itsashik.dev` (and preview domains) as **CORS origins**, for live updates
   - add a **webhook** to `https://www.itsashik.dev/api/sanity-webhook` with header
     `Authorization: Bearer $SANITY_WEBHOOK_SECRET`
3. The cron in `vercel.json` calls the GitHub sync daily; Vercel adds the `CRON_SECRET` header.

## License

Code is released under the [MIT License](LICENSE). Blog posts, images and other site content are
© Ashik Eqbal and not covered by it. The Geist fonts in `assets/fonts` (used by the generated
share images) are under the SIL Open Font License; see `assets/fonts/OFL.txt`.
