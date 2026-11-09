import { expect, test } from "@playwright/test"

// CI has no Spotify/Trakt/Jellyfin credentials: everything must stay hidden, never broken.
test.describe("live activity without credentials", () => {
  test("the API answers with nulls and a short CDN cache", async ({ request }) => {
    const response = await request.get("/api/now-playing")
    expect(response.status()).toBe(200)
    expect(response.headers()["cache-control"]).toContain("s-maxage=30")
    expect(await response.json()).toEqual({ spotify: null, trakt: null, jellyfin: null })
  })

  test("the hero shows no live line", async ({ page }) => {
    await page.goto("/")
    await page.waitForResponse((r) => r.url().endsWith("/api/now-playing"))
    await expect(page.locator('#home a[href="/now#live"]')).toHaveCount(0)
  })
})
