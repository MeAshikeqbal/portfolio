import { describe, expect, it } from "vitest"
import { contactSchema } from "@/lib/contact-schema"

const valid = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  message: "Hello, I would like to chat about a project.",
  turnstileToken: "token",
}

describe("contactSchema", () => {
  it("accepts a valid submission", () => {
    expect(contactSchema.safeParse(valid).success).toBe(true)
  })

  it("trims whitespace before checking lengths", () => {
    const result = contactSchema.safeParse({ ...valid, name: "  A  " })
    expect(result.success).toBe(false)
  })

  it.each([
    ["email", "not-an-email", "Please enter a valid email address."],
    ["message", "too short", "Message must be at least 10 characters."],
    ["message", "x".repeat(5001), "Message must be at most 5000 characters."],
    ["turnstileToken", "", "Please complete the Cloudflare Turnstile challenge."],
  ])("rejects an invalid %s with a helpful message", (field, value, error) => {
    const result = contactSchema.safeParse({ ...valid, [field]: value })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe(error)
  })
})
