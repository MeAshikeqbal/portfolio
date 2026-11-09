import { describe, expect, it } from "vitest"
import { buildMessageDocument } from "@/lib/inbox-message"

describe("inbox messages", () => {
  it("builds an unread message document", () => {
    const submission = {
      name: "Ada",
      email: "ada@example.com",
      message: "Hello there, a project idea.",
    }
    expect(
      buildMessageDocument(submission, { id: "abc", now: new Date("2026-11-09T10:00:00Z") }),
    ).toEqual({
      _id: "abc",
      _type: "message",
      status: "unread",
      receivedAt: "2026-11-09T10:00:00.000Z",
      ...submission,
    })
  })
})
