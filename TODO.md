# TODO

Content work agreed on 2026-11-09. Owner: Claude, with facts from Ashik where marked.
Everything lands in the Sanity Studio (or through a dry-run-first script in `scripts/`), never
invented: each draft is built from the repo, the live site and Ashik's answers, then reviewed by
Ashik before it's published.

## 1. Project case studies (critique item 6)

Every project page currently says "No write-up yet". Write a short case study (about 150–300
words) in each project's **Case study** field, in this order:

1. **What it is**: one paragraph, plain words.
2. **Why I built it**: the problem or the occasion.
3. **Stack and how it runs**: hosting, services, anything self-hosted.
4. **One hard problem**: what broke or was tricky, and how it was solved.
5. **Status today**: maintained, archived, or what's next.

| Project | Source to draft from | Needs from Ashik |
|---|---|---|
| Portfolio | This repo (README, PRODUCT.md, DESIGN.md, PR history) | Nothing; draft first |
| mc-status-page | GitHub README | Who it's for; is cmc-status.cappybaralab.me the live site? |
| get-a-date | GitHub README | The story behind it; is getadate.ink still up? |
| bluebox | GitHub README | Why Gun.js and E2E; why it was archived |
| menu | GitHub README | Which café uses it; is menu.timepasscafe.in still up? |
| jhs | GitHub README | Your role for the school site; is it still in use? |
| Arogify | Repo is private (GitHub 404); arogify.in returned Cloudflare 522 | Everything: what it is now, and whether the site is coming back |

Order: Portfolio, mc-status-page, get-a-date first (the strongest homelab/infra stories), then the
rest.

## 2. Project names and one-liners (critique item 7)

Replace lowercase repo names and generic blurbs with real titles and one concrete sentence each.
Keep the repo name visible as metadata. Proposals go to Ashik for approval before publishing.

- [ ] menu: real product name plus what it does, for whom
- [ ] jhs: "Jalalpur High School website" (to confirm), plus what it does
- [ ] bluebox: drop "innovative"; say what it does (end-to-end encrypted chat over Gun.js)
- [ ] get-a-date, mc-status-page: title case and a sharper one-liner
- [ ] Arogify: fix "Arogify - Blog Platform" to use an en dash, or a better name
- [ ] Give **jhs** a slug so it gets its own page like the others

## 3. Experience descriptions (critique item 8)

- [ ] **Head of Software, EXSBE (2026):** one line on scope and one concrete outcome. *Needs
      Ashik:* team size, what you own, one result.
- [ ] **Specialist Business Consultant in IT, Chelson Gordon Consultancy (2025):** same. *Needs
      Ashik.*
- [ ] Fix the stray leading space in the year " 2025".
- [ ] Check the education entry "2022 – 2026" that shows as "current" in November 2026: finished
      or ongoing?

## Done

- [x] Archive option for posts (Studio: **Archived** in a post's Meta tab)
- [x] Author and follow card at the end of every post
- [x] Related posts ranked by rare shared topics
- [x] Live-site screenshot as the project cover when none is set
- [x] Full post content in the RSS feed
