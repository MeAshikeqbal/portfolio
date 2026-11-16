import { describe, expect, it } from "vitest"
import { contactSchema } from "@/lib/contact-schema"
import messages from "@/messages/en.json"

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
    ["email", "not-an-email", "emailInvalid"],
    ["message", "too short", "messageTooShort"],
    ["message", "x".repeat(5001), "messageTooLong"],
    ["turnstileToken", "", "challengeMissing"],
  ])("rejects an invalid %s with an error code", (field, value, error) => {
    const result = contactSchema.safeParse({ ...valid, [field]: value })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe(error)
  })

  it("has an English message for every error code", () => {
    const codes = Object.keys(messages.contact.errors)
    for (const code of ["nameTooShort", "nameTooLong", "emailInvalid", "challengeAgain"]) {
      expect(codes).toContain(code)
    }
  })
})
