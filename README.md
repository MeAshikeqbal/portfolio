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
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run check` | Lint + typecheck + unit tests |
| `npm run lint` · `npm run typecheck` · `npm test` | Individually |
| `npm run format` · `npm run format:check` | Prettier (with Tailwind class sorting) |
| `npm run test:e2e` | Playwright against a production build (`npm run build` first) |
| `npm run typegen` | Regenerate `sanity.types.ts` after changing a schema or a query |

## Project layout

```
app/
  (root)/            public site: home, /post, /post/[slug], /projects, /projects/[slug]
  studio/            embedded Sanity Studio
  styleguide/        living style guide (404 in production)
  api/               sanity-webhook (revalidation), sync-github-data (cron)
  icons/             self-hosted Iconify SVGs for the skills inventory
  opengraph-image.tsx, sitemap.ts, robots.ts, manifest.ts, rss.xml/
components/
  dashboard/         design-system primitives (StatusPill, Panel, DataRow, Sparkline…)
  home/ blog/ projects/ site/ portable-text/ seo/
  ui/                shadcn/ui components
lib/                 data access (api.ts), helpers, structured data, OG frame
sanity/              schema types, GROQ queries, clients
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
  repositories.
- **Design tokens.** Colours are OKLCH tokens in `app/globals.css`.
  `tests/unit/tokens.test.ts` fails the build if any text/background pair drops below WCAG AA.
- **Security.** `next.config.ts` sends HSTS, `nosniff`, a referrer policy, a permissions policy
  and a Content Security Policy. The CSP applies to production builds only and doesn't cover
  the Studio. `tests/e2e/security.spec.ts` fails on any CSP violation.

## Content tips (Sanity Studio)

- **Project `status`** (active / maintained / archived) turns on status pills. Nothing is
  claimed until it's set.
- **Project `featured` + `order`** decide what leads the home page. Adding `tech` and a
  case-study `body` fills `/projects/[slug]` and the filters.
- **`excerpt`** and the **SEO** fields (title, description, social image, noindex) override
  the generated defaults for posts and projects.
- **Skill icons** are [Iconify](https://icon-sets.iconify.design) names (`logos:aws`,
  `mdi:security`) from the `logos`, `mdi`, `simple-icons` and `ri` sets.
- **`/uses` and `/now`** are singletons under *Personal Info* in the Studio. Each page stays
  a 404, and isn't linked from the footer, ⌘K palette or sitemap, until it has published
  content.
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
