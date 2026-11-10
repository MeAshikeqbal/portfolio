import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"
import { ABOUT_PAGES } from "./about-state"

// CI has no Spotify/Trakt/Jellyfin credentials: everything must stay hidden, never broken.
test.describe("live activity without credentials", () => {
  test("the API answers with nulls and a short CDN cache", async ({ request }) => {
    const response = await request.get("/api/now-playing")
    expect(response.status()).toBe(200)
    expect(response.headers()["cache-control"]).toContain("s-maxage=30")
    expect(await response.json()).toEqual({ spotify: null, trakt: null, jellyfin: null })
  })

  test("the hero shows no live line", async ({ page }) => {
    // Listen before navigating: the poll can answer before goto() resolves.
    const answered = page.waitForResponse((r) => r.url().endsWith("/api/now-playing"))
    await page.goto("/")
    await answered
    await expect(page.locator('#home a[href="/now#live"]')).toHaveCount(0)
  })
})

// The API is stubbed per test, so these run the same with or without credentials.
test.describe("now playing in the statusline", () => {
  const minute = 60_000
  const playing = (track: string) => ({
    spotify: {
      state: "playing",
      track,
      artists: "yung kai",
      url: null,
      art: null,
      at: null,
      startedAt: new Date(Date.now() - minute).toISOString(),
      endsAt: new Date(Date.now() + 2 * minute).toISOString(),
    },
    trakt: null,
    jellyfin: null,
  })
  const statusline = (page: Page) => page.getByRole("region", { name: "Site status" })

  test("shows what's playing with its progress, from one request shared with the hero", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "the statusline cell only shows from lg up")
    let requests = 0
    await page.route("**/api/now-playing", (route) => {
      requests++
      return route.fulfill({ json: playing("blue") })
    })
    await page.goto("/")
    const cell = statusline(page).getByRole("link", { name: "Listening to blue — yung kai" })
    await expect(cell).toBeVisible()
    await expect(cell).toHaveAttribute("href", "/now#live")
    await expect(cell).toHaveAttribute("title", /^1:0\d \/ 3:00$/)
    // The hero's live line reads the same response.
    await expect(page.locator('#home a[href="/now#live"]')).toHaveCount(1)
    expect(requests).toBe(1)
  })

  test("scrolls a long title, but holds still with reduced motion", async ({ page, isMobile }) => {
    test.skip(isMobile, "the statusline cell only shows from lg up")
    const long = "An extremely long track title that will never fit in the statusline cell"
    await page.route("**/api/now-playing", (route) => route.fulfill({ json: playing(long) }))
    await page.goto("/post")
    const cell = statusline(page).getByRole("link", { name: `Listening to ${long} — yung kai` })
    await expect(cell.locator(".marquee-track")).toHaveCount(1)
    await page.emulateMedia({ reducedMotion: "reduce" })
    await expect(cell.locator(".marquee-track")).toHaveCount(0)
    await expect(cell).toBeVisible()
  })

  test("stays out of the statusline when nothing is playing", async ({ page }) => {
    const last = playing("blue")
    await page.route("**/api/now-playing", (route) =>
      route.fulfill({
        json: {
          ...last,
          spotify: {
            ...last.spotify,
            state: "last",
            at: new Date().toISOString(),
            startedAt: null,
            endsAt: null,
          },
        },
      }),
    )
    const answered = page.waitForResponse((r) => r.url().endsWith("/api/now-playing"))
    await page.goto("/")
    await answered
    await expect(statusline(page).getByRole("link", { name: /listening|watching/i })).toHaveCount(0)
  })

  test("passes axe with the cell and the progress bars on screen", async ({ page, isMobile }) => {
    test.skip(isMobile, "the statusline cell only shows from lg up")
    await page.route("**/api/now-playing", (route) => route.fulfill({ json: playing("blue") }))
    // /now only exists once published; the statusline is on every page either way.
    const published = ABOUT_PAGES === "published"
    await page.goto(published ? "/now" : "/")
    await expect(statusline(page).getByRole("link", { name: /^Listening to/ })).toBeVisible()
    if (published)
      await expect(page.getByRole("progressbar", { name: "Track progress" })).toBeVisible()
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    )
    expect(
      serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
    ).toEqual([])
  })
})
