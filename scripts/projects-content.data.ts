/**
 * Project copy for the 2026-11 refresh, drafted from each repository (README, package manifest,
 * commit history, contributors) and the owner's answers. Bodies use a tiny Markdown subset that
 * scripts/projects-content.ts turns into Portable Text: "## " headings, "- " bullets, blank-line
 * paragraphs, `code` and **strong** inline.
 *
 * Owner decisions (2026-11-16): dead live sites lose their URL and are archived; bluebox, menu,
 * jhs and Arogify are unpublished; AsteronixHQ products are presented as the owner's own work
 * without naming the company (so no AsteronixHQ repo links); private repos get no repo link.
 */

export type Status = "active" | "maintained" | "archived"

export interface ProjectCopy {
  /** Existing document id to update, or the id to create. */
  _id: string
  title: string
  slug: string
  description: string
  status: Status
  featured: boolean
  tech: string[]
  url: string | null
  github: string | null
  /** First commit, as the project's start date. */
  publishedAt: string
  body: string
}

/** In display order (orderRank is assigned from this order). */
export const PROJECTS: ProjectCopy[] = [
  {
    _id: "project-peerhelp",
    title: "PeerHelp",
    slug: "peerhelp",
    description: "A campus marketplace and tutoring board for verified students only.",
    status: "maintained",
    featured: true,
    tech: [
      "Next.js",
      "React",
      "TypeScript",
      "Supabase",
      "PostgreSQL",
      "Tailwind CSS",
      "Resend",
      "Vercel",
    ],
    url: "https://www.peerhelp.space",
    github: "https://github.com/MeAshikeqbal/peerhelp",
    publishedAt: "2026-05-08T00:00:00.000Z",
    body: `
## What it is

PeerHelp is a campus platform where verified students buy and sell textbooks, notes, past-year papers and lab gear, rent books for a term, and book sessions with peer tutors. Only students who prove they belong to the college can list, message or request a session.

## Why

On campus, textbooks are a logistics problem more than a price problem. The book you need is on a shelf in a hostel two blocks away, and the senior who aced your course would happily tutor you, but WhatsApp groups vanish and noticeboards go stale. PeerHelp is the directory and reputation layer that connects them. It never touches money: students pay each other in person, which keeps the legal surface close to zero.

## Stack

Next.js with Server Components by default, deployed on Vercel. Supabase provides Postgres, auth, storage and realtime, and access control lives in the database as row-level security. Resend sends one-time codes and notifications, and a hand-written service worker handles Web Push. Listing a textbook takes a webcam ISBN scan, which fills in the title and cover from Open Library. I wrote most of the code, with [Rishita Shaw](https://github.com/Rishitashawtech11), [Shrestha Saha](https://github.com/shrestha2005) and [Sayantika Boral](https://github.com/sayantikkaaa) contributing.

## The hard part

Trust. Students verify through a college-email code or a document that's reviewed by hand. Every image URL is checked on write, so the client can't store an arbitrary link. Messages are written only through database functions that check block lists and thread membership. Rate limits live in a Postgres table, so a serverless cold start can't reset them. And once a deal is accepted, the listing's key fields lock and the API answers \`423 Locked\`.

## Status

Live and maintained.
`,
  },
  {
    _id: "project-flowsocial",
    title: "FlowSocial",
    slug: "flowsocial",
    description: "Writes posts for Shopify products with AI and schedules them on eight networks.",
    status: "maintained",
    featured: true,
    tech: ["Go", "Encore", "Next.js", "PostgreSQL", "Supabase", "Prisma", "OpenAI", "Shopify"],
    url: null,
    github: null,
    publishedAt: "2026-01-15T00:00:00.000Z",
    body: `
## What it is

FlowSocial runs social media for small businesses. A workspace connects to a Shopify store; FlowSocial writes captions and hashtags for its products with OpenAI, then schedules and publishes them to Facebook, Instagram, Threads, X, LinkedIn, Bluesky, Mastodon and Pinterest.

## Two versions

The first version was a Next.js app on Supabase and Prisma that published through Publer. It worked, but scheduling, retries and token refresh were all packed into one web app. I started rebuilding it as Go services on Encore (identity, workspaces, integrations, content, media and a job engine) that talk over pub/sub.

## The hard part

Every network has its own rules and its own way of failing. Each post is checked against per-platform limits on length, image count and media type before it's queued. Every publish attempt is logged with its payload, and failures retry with exponential backoff, up to three times. A cron refreshes expiring OAuth tokens every 30 minutes and deactivates revoked accounts. Webhooks from Meta, LinkedIn and X are signature-checked and stored before they're processed.

## Status

Inactive for now, and the code is private. The rebuild has its services and schema in place; publishing still needs end-to-end testing against real platform accounts.
`,
  },
  {
    _id: "project-helper-scripts-tui",
    title: "Helper Scripts TUI",
    slug: "helper-scripts-tui",
    description: "A terminal UI to search, inspect and install Proxmox community helper scripts.",
    status: "maintained",
    featured: true,
    tech: ["Go", "Bubble Tea", "Lip Gloss", "Proxmox VE"],
    url: null,
    github: "https://github.com/MeAshikeqbal/helper-scripts-tui",
    publishedAt: "2026-03-07T00:00:00.000Z",
    body: `
## What it is

A terminal UI for the Proxmox VE community helper scripts, the one-line installers that set up most homelab containers and VMs. Instead of browsing the website and pasting \`curl | bash\` into a shell, you run \`hst\` on the node. From there you fuzzy-search the catalogue, read a script's resources, notes and defaults, pick a variant, confirm, and it runs.

## Stack

Go with Bubble Tea, Bubbles and Lip Gloss. Categories (containers, VMs, miscellaneous) come from the upstream repository's layout, with counts in the sidebar. The script list and metadata are cached locally, so later launches open immediately and the UI is usable before the network answers. Each release ships a Linux binary, and a one-line install script puts \`hst\` in \`/usr/local/bin\`.

## The hard part

Layout. Terminals wrap long lines on their own, which breaks a multi-pane layout as soon as a description is wider than its column. Most of the work after the first version went into measuring and truncating every line, recalculating viewport heights for the fullscreen details view, and enforcing a minimum usable width.

## Status

First beta released; maintained.
`,
  },
  {
    _id: "95f4e316-56f2-4dce-9951-885324ef0414",
    title: "itsashik.dev",
    slug: "portfolio",
    description: "This site: a portfolio and blog laid out like a homelab dashboard.",
    status: "active",
    featured: true,
    tech: [
      "Next.js",
      "React",
      "TypeScript",
      "Sanity",
      "Tailwind CSS",
      "Upstash Redis",
      "Python",
      "Vercel",
    ],
    url: "https://www.itsashik.dev",
    github: "https://github.com/MeAshikeqbal/portfolio",
    publishedAt: "2023-01-07T00:00:00.000Z",
    body: `
## What it is

The site you're reading. It's laid out like a homelab dashboard: projects read as services with a measured status, writing is the log, and the lab page shows my three-node Proxmox cluster live.

## Why

Any portfolio can say "I run infrastructure". I wanted this one to show it, so every number on the page is measured, from GitHub or from the lab, and none is typed in by hand.

## Stack

Next.js and React on Vercel, with content in Sanity and a Studio themed to match the site. Tailwind CSS with a monochrome palette, where colour only ever means status. Each lab node runs a small Python agent that sends a signed heartbeat every 30 seconds; the site keeps 24 hours of history in Upstash Redis and marks a node down from its peers' reports. GitHub stats sync on a schedule, or on demand from the Studio.

## The hard part

A failure that only happened in production. After a refactor, preview deploys passed, a local production build passed, and the production deploy failed. The difference was one environment variable: with a Sanity read token set, static page generation asked for draft mode, which isn't allowed at build time. Pinning those queries to published content fixed it, and I now reproduce production-only failures locally by setting a placeholder token.

## Status

Active. It's where I try things first.
`,
  },
  {
    _id: "project-exsbe-theme",
    title: "exsbe-theme",
    slug: "exsbe-theme",
    description: "A graphite KDE Plasma 6 desktop for Bazzite with live lab status in the top bar.",
    status: "active",
    featured: false,
    tech: ["KDE Plasma", "QML", "Python", "Bash", "Bazzite", "Proxmox VE", "Jellyfin"],
    url: null,
    github: "https://github.com/MeAshikeqbal/exsbe-theme",
    publishedAt: "2026-10-27T00:00:00.000Z",
    body: `
## What it is

A complete KDE Plasma 6 desktop for Bazzite, built around one graphite palette. It has a slim top bar of live status chips, an auto-hiding dock, four purpose-built workspaces and desktop cards. The same colours carry through the terminal, the editor, the boot splash and the login screen.

## How it works

Chips for the system, containers, Proxmox and Jellyfin share one shape and a fixed width, so the bar never shifts as numbers change. A chip only takes colour when something needs attention: amber means worth a look, red means broken. It's the same rule this site follows. Each chip opens a popup with the detail, from per-app CPU to who is streaming what and whether it's transcoding.

One script installs everything at user level, in sections if you want, and keeps site-specific values such as addresses and keys out of the repository. The README screenshots are rendered from the widgets themselves, using sample data instead of a real cluster.

## The hard part

Bazzite is an image-based, immutable system, so nothing can be patched into the OS. Everything has to live at user level and survive updates: themed dock launchers that outlast Homebrew upgrades, widgets that relaunch after a shell restart, and a boot theme that cleanly replaces older builds.

## Status

Active; the newest thing I'm working on.
`,
  },
  {
    _id: "project-printflow",
    title: "PrintFlow",
    slug: "printflow",
    description: "A self-hosted print and scan hub: form submissions in, printed documents out.",
    status: "maintained",
    featured: false,
    tech: ["Go", "PostgreSQL", "Next.js", "CUPS", "SANE", "Docker", "Google Drive API"],
    url: null,
    github: null,
    publishedAt: "2026-07-24T00:00:00.000Z",
    body: `
## What it is

PrintFlow turns online form submissions into paper. A Google Form posts to a webhook, and the Go backend downloads any attachments from Google Drive, renders the response as a printable PDF (a guest registration form, for example) and sends it to a network printer. The same dashboard drives the scanner, and it also picks up pages scanned with the printer's own button.

## Stack

A Go backend with PostgreSQL, a Next.js dashboard that streams job status over server-sent events, and Docker Compose for production. Printing goes over IPP, LPD or a raw socket, or through CUPS; scanning goes through SANE.

## The hard part

Real hardware. The printer and scanner are one device but answer on different protocols, so the backend discovers it once and uses that address for both. Scanners also name their flatbed differently ("Flatbed", "Platen", "Glass"), so an empty document feeder falls back through all three. Jobs move through a state machine (pending, downloading, processing, printing, then done or failed), and anything interrupted by a restart is reset on boot instead of lost. Processed files are archived with a SHA-256 checksum.

## Status

Maintained. The code is private.
`,
  },
  {
    _id: "project-emailflow",
    title: "EmailFlow",
    slug: "emailflow",
    description: "Cold-outreach sequences from Gmail that stop the moment a lead replies.",
    status: "maintained",
    featured: false,
    tech: ["Go", "Gin", "PostgreSQL", "Redis", "Asynq", "SolidJS", "Terraform", "Google Cloud"],
    url: null,
    github: null,
    publishedAt: "2026-08-09T00:00:00.000Z",
    body: `
## What it is

EmailFlow sends multi-step outreach sequences from connected Gmail accounts and stops each one when the lead replies. Leads, lists, templates and campaigns live in one place, and replies arrive in a shared inbox.

## Stack

A Go backend on Gin with PostgreSQL, plus Redis and Asynq for queues and scheduled sends. The front end is SolidJS with TanStack Router and Query. It runs serverless on Google Cloud, with every piece of infrastructure defined in Terraform.

## The hard part

Sending at volume without getting an inbox flagged. Sends only go out inside each account's sending window and daily quota, with jittered intervals, through queues that deduplicate so a retry never sends twice. Replies arrive as Gmail push notifications through Pub/Sub, so a sequence halts without waiting for a poll. A background poller still runs alongside, so an outage can't drop a reply. OAuth tokens are encrypted at rest with AES-256-GCM.

## Status

Maintained. The code is private.
`,
  },
  {
    _id: "project-trustvote",
    title: "TrustVote",
    slug: "trustvote",
    description: "Blockchain elections with commit-reveal ballots and a public audit trail.",
    status: "archived",
    featured: false,
    tech: ["Solidity", "Hardhat", "Express", "Prisma", "Next.js", "TypeScript"],
    url: null,
    github: null,
    publishedAt: "2025-12-15T00:00:00.000Z",
    body: `
## What it is

TrustVote is an election system that records votes on a blockchain so anyone can audit the result. Admins create elections through a factory contract, approved voters receive a voter NFT, and a public audit explorer shows each election's on-chain state alongside the database.

## Why

It was my final-year project for the B.Tech in Computer Science, built with [Shubhom Ray](https://github.com/shubhxr4y).

## Stack

Solidity contracts (an election, an election factory and a voter NFT) built with Hardhat. Registration and approval run through an Express API with Prisma, and a Next.js front end handles wallet login. It's all one monorepo.

## The hard part

Keeping a vote secret on a public chain. Voting is commit-reveal: during the election the voter submits only a hash of their choice, kept locally in the browser, and reveals it once voting closes. New voters also have no gas to pay for transactions, so approving a voter automatically funds their wallet whenever its balance drops below a threshold.

## Status

Finished as coursework; archived. The code is private.
`,
  },
  {
    _id: "project-portfolio-tui",
    title: "Portfolio TUI",
    slug: "portfolio-tui",
    description: "This portfolio as a terminal app you can open over SSH.",
    status: "maintained",
    featured: false,
    tech: ["Go", "Bubble Tea", "Lip Gloss", "Wish", "Sanity", "Docker"],
    url: null,
    github: "https://github.com/MeAshikeqbal/portfolio-tui",
    publishedAt: "2026-03-08T00:00:00.000Z",
    body: `
## What it is

A terminal version of this portfolio. It runs as a full-screen TUI locally, or as a self-hostable SSH server that visitors reach with plain \`ssh\`. Either way you browse projects, posts, skills and experience with vim-style keys. Blog posts render from Portable Text, with a table of contents on \`t\`.

## Stack

Go with Bubble Tea, Bubbles and Lip Gloss, and Wish for the SSH server. It reads the same Sanity content as this site, so there's one place to edit, and falls back to built-in content when Sanity is unreachable. A Docker image is built on a self-hosted GitHub Actions runner, and the server generates its own host key on first start.

## The hard part

Fitting rich text into a fixed grid. Paragraphs, lists and code blocks have to wrap to whatever width the client's terminal reports, inside bordered panes, and lists have to stay searchable. To save a row on small terminals, breadcrumbs are drawn into the pane border instead of taking a line of their own.

## Status

Maintained.
`,
  },
  {
    _id: "b554b646-d5de-4db9-9c1e-c0630f8db405",
    title: "Minecraft Server Status",
    slug: "mc-status-page",
    description: "Live status, player list and map for a Java and Bedrock Minecraft server.",
    status: "archived",
    featured: false,
    tech: ["Remix", "React", "TypeScript", "NextUI", "Tailwind CSS", "Docker", "GitHub Actions"],
    url: null,
    github: "https://github.com/MeAshikeqbal/mc-status-page",
    publishedAt: "2024-08-01T00:00:00.000Z",
    body: `
## What it is

A one-page status site for a Minecraft server that both Java and Bedrock players join. It shows whether the server is up, how many players are on and who they are, with the server's BlueMap 3D map embedded below.

## Stack

Remix and NextUI, reading live status from the mcstatus.io API. Server addresses, ports and the map URL are environment variables, so the same image works for any server. GitHub Actions publishes the image to the GitHub Container Registry and Docker Hub, and the README includes a Docker Compose example.

## Status

Archived. The live page is offline, but the image still works for any other server.
`,
  },
  {
    _id: "project-get-a-date",
    title: "Get a Date",
    slug: "get-a-date",
    description: "Valentine's invite links with an anonymous mode, GIFs and AI-written poems.",
    status: "archived",
    featured: false,
    tech: [
      "Next.js",
      "React",
      "TypeScript",
      "MongoDB",
      "Upstash Redis",
      "OpenAI",
      "Resend",
      "Tailwind CSS",
    ],
    url: null,
    github: "https://github.com/MeAshikeqbal/get-a-date",
    publishedAt: "2025-02-04T00:00:00.000Z",
    body: `
## What it is

A Valentine's Day app. You write an invite, get a personal link, and send it with your name on it or as a secret admirer. The invite page adds GIFs, a countdown to the day and, if you want, an AI-written poem.

## Stack

Next.js on Vercel, with invites stored in MongoDB, poems from OpenAI, GIFs from Giphy, email through Resend, and rate limiting on Upstash Redis.

## The hard part

Shipping in time. It went from an empty repository to a public site in two days, ten days before Valentine's Day. Every invite can call OpenAI and send an email, so a public link is a cost risk; rate limiting and API-key checks on the admin routes went in before it launched.

## Status

Archived. The live site is offline; the code is on GitHub.
`,
  },
]

/** Published projects to unpublish (kept as Studio drafts, so they can be restored). */
export const UNPUBLISH: { _id: string; title: string }[] = [
  { _id: "1c2ae709-8b4e-461d-bfae-fa6d879436cd", title: "Arogify - Blog Platform" },
  { _id: "project-menu", title: "menu" },
  { _id: "XHShFN9kgowVmTzh4euuQo", title: "jhs" },
  { _id: "spn7YT6ShmjNZxmBXsw2p3", title: "bluebox" },
]
