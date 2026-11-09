import { describe, expect, it } from "vitest"
import {
  buildMessageDocument,
  buildNotificationEmail,
  escapeHtml,
  studioMessageUrl,
} from "@/lib/inbox-message"

const submission = { name: "Ada <script>", email: "ada@example.com", message: "Hi & <b>hello</b>" }

describe("inbox messages", () => {
  it("builds an unread message document", () => {
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

  it("links to the message in the Studio inbox workspace", () => {
    expect(studioMessageUrl("abc")).toBe(
      "https://www.itsashik.dev/studio/inbox/intent/edit/id=abc;type=message",
    )
  })

  it("escapes HTML", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    )
  })
})

describe("notification email", () => {
  const email = buildNotificationEmail(submission, {
    id: "abc",
    from: "site <a@b.c>",
    to: "me@x.y",
    stored: true,
  })

  it("replies go to the sender", () => {
    expect(email.reply_to).toBe("ada@example.com")
    expect(email.to).toEqual(["me@x.y"])
  })

  it("never puts raw sender input into the HTML", () => {
    expect(email.html).not.toContain("<script>")
    expect(email.html).not.toContain("<b>hello</b>")
    expect(email.html).toContain("Ada &lt;script&gt;")
  })

  it("links to the Studio when stored, and warns when it's the only copy", () => {
    expect(email.text).toContain("/studio/inbox/intent/edit/id=abc")
    const unsaved = buildNotificationEmail(submission, {
      id: "abc",
      from: "f",
      to: "t",
      stored: false,
    })
    expect(unsaved.text).toContain("could NOT be saved")
    expect(unsaved.html).not.toContain("/studio/inbox")
  })
})
