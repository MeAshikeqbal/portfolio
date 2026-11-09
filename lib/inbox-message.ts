import { absoluteUrl, siteConfig } from "@/lib/site"

/**
 * Pure builders for contact-form messages: the Sanity document stored in the private inbox
 * dataset, and the notification email. Kept free of I/O so they can be unit-tested.
 */
export interface ContactSubmission {
  name: string
  email: string
  message: string
}

export interface MessageDocument extends ContactSubmission {
  _id: string
  _type: "message"
  status: "unread"
  receivedAt: string
}

export function buildMessageDocument(
  submission: ContactSubmission,
  { id, now = new Date() }: { id: string; now?: Date },
): MessageDocument {
  return {
    _id: id,
    _type: "message",
    status: "unread",
    receivedAt: now.toISOString(),
    name: submission.name,
    email: submission.email,
    message: submission.message,
  }
}

/** Deep link that opens the message in the Studio's inbox workspace. */
export function studioMessageUrl(id: string): string {
  return absoluteUrl(`/studio/inbox/intent/edit/id=${encodeURIComponent(id)};type=message`)
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char])
}

export interface NotificationEmail {
  from: string
  to: string[]
  reply_to: string
  subject: string
  text: string
  html: string
}

/**
 * Notification for a new message. Replying goes straight to the sender (Reply-To).
 * `stored` is false when saving to the inbox failed, so the email is the only copy.
 */
export function buildNotificationEmail(
  submission: ContactSubmission,
  { id, from, to, stored }: { id: string; from: string; to: string; stored: boolean },
): NotificationEmail {
  const link = studioMessageUrl(id)
  const footer = stored
    ? `Open in the Studio inbox: ${link}`
    : "⚠ This message could NOT be saved to the Studio inbox; this email is the only copy."
  const subject = `New message from ${submission.name.slice(0, 60)} · ${siteConfig.url.replace(/^https?:\/\/(www\.)?/, "")}`

  const text = [
    `From: ${submission.name} <${submission.email}>`,
    "",
    submission.message,
    "",
    "—",
    footer,
    "Reply to this email to answer them directly.",
  ].join("\n")

  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.5;color:#111">
<p style="margin:0 0 12px"><strong>${escapeHtml(submission.name)}</strong> &lt;${escapeHtml(submission.email)}&gt;</p>
<p style="margin:0 0 16px;white-space:pre-wrap">${escapeHtml(submission.message)}</p>
<hr style="border:none;border-top:1px solid #ddd;margin:16px 0">
<p style="margin:0;color:#555;font-size:13px">${
    stored
      ? `<a href="${escapeHtml(link)}">Open in the Studio inbox</a>`
      : "⚠ This message could <strong>not</strong> be saved to the Studio inbox; this email is the only copy."
  } · Reply to this email to answer them directly.</p>
</div>`

  return { from, to: [to], reply_to: submission.email, subject, text, html }
}
