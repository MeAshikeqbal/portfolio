// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const create = vi.fn()
const notify = vi.fn()
const scheduled: Array<() => unknown> = []

vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
vi.mock("next/server", () => ({ after: (task: () => unknown) => scheduled.push(task) }))
vi.mock("@/sanity/lib/inbox-client", () => ({
  inboxClient: { create: (...args: unknown[]) => create(...args) },
}))
vi.mock("@/lib/notify", () => ({ notifyNewMessage: (...args: unknown[]) => notify(...args) }))

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
    notify.mockReset()
    scheduled.length = 0
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY = "secret"
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ success: true })),
    )
  })

  it("stores the message in the private inbox and emails after responding", async () => {
    create.mockResolvedValue({})
    const state = await submitContact({ status: "idle" }, form(valid))
    expect(state.status).toBe("success")
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ _type: "message", status: "unread", email: "ada@example.com" }),
    )
    expect(notify).not.toHaveBeenCalled()
    expect(scheduled).toHaveLength(1)
    await scheduled[0]()
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Ada Lovelace" }),
      expect.objectContaining({ stored: true }),
    )
  })

  it("falls back to email when storing fails, so the message isn't lost", async () => {
    create.mockRejectedValue(new Error("dataset not found"))
    notify.mockResolvedValue(true)
    const state = await submitContact({ status: "idle" }, form(valid))
    expect(state.status).toBe("success")
    expect(notify).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ stored: false }),
    )
  })

  it("reports an error only when both storing and emailing fail", async () => {
    create.mockRejectedValue(new Error("down"))
    notify.mockResolvedValue(false)
    const state = await submitContact({ status: "idle" }, form(valid))
    expect(state.status).toBe("error")
    expect(state.values?.message).toBe(valid.message)
  })

  it("stores nothing for honeypot submissions", async () => {
    const state = await submitContact({ status: "idle" }, form({ ...valid, hp_field_7c1: "bot" }))
    expect(state.status).toBe("success")
    expect(create).not.toHaveBeenCalled()
    expect(notify).not.toHaveBeenCalled()
  })
})
