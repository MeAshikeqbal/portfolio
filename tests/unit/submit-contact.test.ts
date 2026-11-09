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
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ success: true })),
    )
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

  it("stores nothing when the anti-spam check fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ success: false })),
    )
    const state = await submitContact({ status: "idle" }, form(valid))
    expect(state.status).toBe("error")
    expect(create).not.toHaveBeenCalled()
  })
})
