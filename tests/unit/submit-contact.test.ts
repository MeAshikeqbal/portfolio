// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const create = vi.fn()

vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
vi.mock("@/sanity/lib/inbox-client", () => ({
  inboxClient: { create: (...args: unknown[]) => create(...args) },
}))

const { submitContact } = await import("@/actions/submit-contact")

function form(fields: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.set(key, value)
  return data
}

/** What Siteverify returns for a good token from the production contact form. */
const passing = { success: true, action: "contact", hostname: "www.itsashik.dev" }

function siteverify(body: object, init?: ResponseInit) {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json(body, init))
  vi.stubGlobal("fetch", fetch)
  return fetch
}

const valid = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  message: "Hello, I'd like to talk about a project.",
  "cf-turnstile-response": "token",
}

describe("submitContact", () => {
  beforeEach(() => {
    create.mockReset()
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY = "secret"
    delete process.env.CLOUDFLARE_TURNSTILE_HOSTNAMES
    siteverify(passing)
  })

  it("stores the message in the private inbox", async () => {
    create.mockResolvedValue({})
    const state = await submitContact({ status: "idle" }, form(valid))
    expect(state.status).toBe("success")
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ _type: "message", status: "unread", email: "ada@example.com" }),
    )
  })

  it("reports an error and keeps the input when storing fails", async () => {
    create.mockRejectedValue(new Error("down"))
    const state = await submitContact({ status: "idle" }, form(valid))
    expect(state.status).toBe("error")
    expect(state.values?.message).toBe(valid.message)
  })

  it("stores nothing for honeypot submissions", async () => {
    const state = await submitContact({ status: "idle" }, form({ ...valid, hp_field_7c1: "bot" }))
    expect(state.status).toBe("success")
    expect(create).not.toHaveBeenCalled()
  })

  it("sends the secret and token to Siteverify", async () => {
    create.mockResolvedValue({})
    const fetch = siteverify(passing)
    await submitContact({ status: "idle" }, form(valid))
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify")
    expect(JSON.parse(init.body as string)).toMatchObject({ secret: "secret", response: "token" })
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it.each([
    ["the token is invalid", { success: false, "error-codes": ["invalid-input-response"] }],
    ["the token was issued for another action", { ...passing, action: "login" }],
    ["the token was issued on another hostname", { ...passing, hostname: "evil.example" }],
    ["Siteverify omits the hostname", { success: true, action: "contact" }],
  ])("stores nothing when %s", async (_, body) => {
    siteverify(body)
    const state = await submitContact({ status: "idle" }, form(valid))
    expect(state.status).toBe("error")
    expect(state.fieldErrors?.turnstileToken).toBeDefined()
    expect(create).not.toHaveBeenCalled()
  })

  it("stores nothing when Siteverify errors", async () => {
    siteverify({}, { status: 500 })
    const state = await submitContact({ status: "idle" }, form(valid))
    expect(state.status).toBe("error")
    expect(create).not.toHaveBeenCalled()
  })

  it("stores nothing when Siteverify is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("timed out", "TimeoutError")
      }),
    )
    const state = await submitContact({ status: "idle" }, form(valid))
    expect(state.status).toBe("error")
    expect(create).not.toHaveBeenCalled()
  })

  it("rejects oversized tokens without calling Siteverify", async () => {
    const fetch = siteverify(passing)
    const state = await submitContact(
      { status: "idle" },
      form({ ...valid, "cf-turnstile-response": "x".repeat(2049) }),
    )
    expect(state.status).toBe("error")
    expect(fetch).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it("accepts hostnames from CLOUDFLARE_TURNSTILE_HOSTNAMES", async () => {
    create.mockResolvedValue({})
    process.env.CLOUDFLARE_TURNSTILE_HOSTNAMES = "localhost, example.com"
    siteverify({ ...passing, hostname: "example.com" })
    expect((await submitContact({ status: "idle" }, form(valid))).status).toBe("success")

    siteverify(passing)
    expect((await submitContact({ status: "idle" }, form(valid))).status).toBe("error")
  })
})
