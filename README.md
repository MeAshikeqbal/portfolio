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
  (root)/            public site: home, /post, /post/[slug], /projects, /projects/[slug]
  studio/            embedded Sanity Studio
  styleguide/        living style guide (404 in production)
  api/               sanity-webhook (revalidation), sync-github-data (cron), github-sync (Studio)
  icons/             self-hosted Iconify SVGs for the skills inventory
  opengraph-image.tsx, sitemap.ts, robots.ts, manifest.ts, rss.xml/
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

- **Content and freshness.** Every read goes through `sanityFetch` (`lib/api.ts`). Pages are
  static. `<SanityLive />` revalidates them when content is published, and the Sanity webhook
  (`/api/sanity-webhook`) is the backstop for changes made while nobody is on the site.
- **Typed queries.** All GROQ lives in `sanity/lib/queries.ts`. After editing a query or a
  schema, run `npm run typegen`.
- **GitHub stats.** `/api/sync-github-data` runs daily (`vercel.json`). It updates stars,
  language, last push and past-year commit activity (including a 12-week series for the
  sparklines) on every project with a repo. It also creates draft projects for new public
  repositories. In the Studio, **Sync from GitHub** (a project's ⋯ menu) or **Sync all now**
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
  case-study `body` fills `/projects/[slug]` and the filters.
- **`excerpt`** and the **SEO** fields (title, description, social image, noindex) override
  the generated defaults for posts and projects.
- **Skill icons** are [Iconify](https://icon-sets.iconify.design) names (`logos:aws`,
  `mdi:security`) from the `logos`, `mdi`, `simple-icons` and `ri` sets. The icon field has a
  search and warns when a name doesn't exist.
- **Rich text** has code blocks (language, filename, highlighted lines), note/warning
  callouts, numbered lists and inline code. `/styleguide` shows every block type.
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
  - Env vars: `LAB_HEARTBEAT_SECRET`, plus Upstash (`UPSTASH_REDIS_REST_*` or `KV_REST_API_*`).
- **`/now`** is a singleton under *Personal Info*. It stays a 404, and isn't linked from the
  footer, ⌘K palette or sitemap, until it has published content. It turns its date pill amber
  once it hasn't been edited for `siteConfig.nowStaleAfterDays`.
- **Seeding Homecave and `/now`.** The content lives in `scripts/about-content.data.ts` and is
  published by a revision-aware script (dry run by default; `--execute` refuses while
  `// REVIEW:` comments remain or if anything changed in Sanity since the dry run):
  `npx sanity exec scripts/about-content.ts --with-user-token [-- --execute]`.
  `scripts/about-content.validate.ts` rejects IPs, hostnames, ports and versions in the copy.
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
