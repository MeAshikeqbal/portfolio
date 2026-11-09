import { expect, test } from "@playwright/test"

test.describe("draft previews", () => {
  test("can't be enabled without a read token or a valid Studio secret", async ({ request }) => {
    const response = await request.get("/api/draft-mode/enable", { maxRedirects: 0 })
    // 501 when SANITY_API_READ_TOKEN isn't set; with a token, a missing secret is rejected.
    expect([401, 501]).toContain(response.status())
  })

  test("exiting only redirects to local paths", async ({ request }) => {
    const local = await request.get("/api/draft-mode/disable?redirect=/projects", {
      maxRedirects: 0,
    })
    expect(local.status()).toBe(307)
    expect(new URL(local.headers()["location"]).pathname).toBe("/projects")

    for (const target of ["//evil.example", "https://evil.example/x"]) {
      const response = await request.get(
        `/api/draft-mode/disable?redirect=${encodeURIComponent(target)}`,
        {
          maxRedirects: 0,
        },
      )
      const location = new URL(response.headers()["location"])
      expect(location.host).not.toBe("evil.example")
      expect(location.pathname).toBe("/")
    }
  })
})
