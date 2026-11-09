# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Mainly **other engineers and technical readers**: people who arrive from a post, a feed reader, GitHub, or a link someone shared. They come to read about building and running software (web apps, homelab, self-hosted AI) and to look at the code behind it.

Recruiters and hiring managers are a secondary audience. The site is not built around a job search; the "open to opportunities" badge was switched off on 2026-11-09.

## Product Purpose

itsashik.dev is the personal site, portfolio and blog of Ashik Eqbal, a software engineer. It brings together Ashik's writing, projects, experience and skills on a site Ashik runs personally.

A visit counts as a success when the visitor does one of these:

- **reads and follows the writing**, through posts and the RSS feed (`/rss.xml`);
- **digs into the work**: project pages, GitHub repos, live projects;
- **gets in touch** through the contact form or a social profile.

Downloading the résumé (`/resume.pdf`) is not one of the goals, but the hero keeps Résumé as its primary button by choice.

## Positioning

**A full-stack engineer who also runs their own infrastructure.** Ashik builds web apps end to end and then operates them on a homelab: self-hosting, ops, and self-hosted AI at home. The site itself shows this: projects carry live GitHub data (stars, last push, commit activity), and the whole site is presented as a status dashboard for the things Ashik runs.

## Operating Context

- Readers mostly land on a single post or project page rather than the home page, often from a feed, a search, or GitHub.
- Ashik writes and edits all content in the Sanity Studio embedded at `/studio`, which has two workspaces: `content` (public) and `inbox` (private contact submissions). Project stats sync from GitHub every day and can also be synced on demand from the Studio.
- Routes: home (`/`), writing (`/post`, `/post/[slug]`), projects (`/projects`, `/projects/[slug]`), `/uses`, `/now`, `/resume.pdf`, `/rss.xml`, and a ⌘K command palette.

## Capabilities and Constraints

- **Stack (incumbent):** Next.js 16 App Router (static prerendering), React 19, TypeScript, Sanity 6, Tailwind CSS 4, shadcn/ui on Radix, Shiki, `next/og`, Vercel hosting. Pages are static and revalidate when content is published.
- **Content comes from Sanity:** posts, projects, experience, education, skills, CV, `/uses`, `/now`. Copy belongs in the CMS rather than in code, except site-wide identity, which lives in `lib/site.ts`.
- **GitHub sync:** projects carry stars, primary language, last push, past-year commits and a 12-week activity series.
- **Availability badge:** configured in `lib/site.ts` as `up` / `warn` / `idle`, or `null` to hide it (hidden since 2026-11-09). When shown, it is the node panel's status.
- **Home page writing:** posts marked **featured** in the Studio come first, then the newest; three in all.
- **Homelab panel:** the hero lists up to five items from the section of `/uses` whose title starts with "Homelab". It stays hidden until that section exists.
- **GitHub sync status:** the system bar shows the sync's health only once it has run, and re-judges its age in the visitor's browser.
- **Contact form:** protected by Cloudflare Turnstile; submissions go to the private `inbox` dataset.
- **Security:** strict security headers and a CSP. Third-party scripts and assets have to fit inside them.
- **Tagline (confirmed 2026-11-09):** "Building for the web, running my own infrastructure, and writing up what breaks." It lives in `lib/site.ts`.
- **Not decided:** the role or seniority to put in the headline beyond "Software engineer".

## Brand Commitments

- **Name and identity:** Ashik Eqbal, `itsashik.dev`, handle `@me_ashikeqbal`. GitHub `MeAshikEqbal`, LinkedIn `itsashik`.
- **The homelab-dashboard metaphor is how the site is organized.** Headings and actions stay in plain words ("Writing", "Projects", "Get in touch"); the dashboard vocabulary lives in panel headers and real status:
  - projects are **services**;
  - writing is the **log** ("incident log" was dropped on 2026-11-09 because it read as outages);
  - skills are the **inventory**.
  The site never shows a healthy state it doesn't measure.
- **Colour means status only:** green = live, amber = attention, red = down, blue = link/info. There is no brand colour. The full visual system is in the code (`app/globals.css`, `components/dashboard/`) and has not yet been written up in DESIGN.md.
- **Voice:** first person, from a practitioner, about real things Ashik has built and run (for example "Trial, Error, and Ethernet: My Homelab Learning Journey", "Why I Started Self-Hosting AI at Home").

## Evidence on Hand

- **Writing:** published posts in Sanity. The 2025–2026 homelab and self-hosting posts match the positioning. The older posts from 2022–2023 are general tech essays (AI ethics, quantum computing, VR, edge computing).
- **Projects:** Arogify (Next.js + Sanity blog platform), this portfolio, Bluebox (end-to-end encrypted chat on Svelte + Gun.js), mc-status-page, get-a-date, menu, jhs. Each carries live GitHub stats.
- **Education:** B.Tech in Computer Science and Engineering, Supreme Knowledge Foundation (SKF).
- **Assets:** portrait (`public/me.jpeg`), OG images generated with `next/og`, a CV file in Sanity served at `/resume.pdf`.
- **Not on hand, so never fabricate:** testimonials, client names, employer logos, traffic or reader numbers, uptime or performance figures for real services, or any other claims about outcomes. Every number shown has to come from GitHub sync or the CMS.

## Product Principles

1. **Written for engineers.** Lead with the actual thing: code, configs, decisions, what broke. Skip the self-promotion.
2. **The site shows the work it describes.** Real data (GitHub activity, status, the dates on `/now`) beats adjectives. If it can't be measured or linked, don't claim it.
3. **Easy to follow.** Reading, subscribing (RSS) and moving between related posts and projects should take no effort. Contact is always within reach, but it never interrupts.
4. **The metaphor serves the content.** The dashboard framing is there to organize and orient readers. It never gets in the way of reading a post or understanding a project.

## Accessibility & Inclusion

- WCAG 2.1 AA is the floor, enforced in two places: `tests/unit/tokens.test.ts` fails the build if any text/background token pair drops below AA contrast, and Playwright + axe (`wcag2a`, `wcag2aa`, `wcag21aa`) audit the key pages.
- The theme follows the system setting (light and dark). Motion respects `prefers-reduced-motion`, which `app/globals.css` handles.
- Status is never shown by colour alone: `StatusPill` always has a visible label, and `StatusDot` takes a screen-reader label.
