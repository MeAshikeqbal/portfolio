import "server-only"

import { buildNotificationEmail, type ContactSubmission } from "@/lib/inbox-message"

/**
 * Emails a new contact message via Resend (https://resend.com). Returns false (and logs)
 * instead of throwing, so a mail problem never breaks a submission.
 *
 * Env: RESEND_API_KEY, CONTACT_NOTIFY_TO (your address), CONTACT_NOTIFY_FROM (a sender on a
 * domain verified in Resend; `onboarding@resend.dev` works for testing).
 */
export async function notifyNewMessage(
  submission: ContactSubmission,
  { id, stored }: { id: string; stored: boolean },
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.CONTACT_NOTIFY_TO
  const from = process.env.CONTACT_NOTIFY_FROM || "itsashik.dev <onboarding@resend.dev>"
  if (!apiKey || !to) {
    console.warn("Contact notification skipped: RESEND_API_KEY or CONTACT_NOTIFY_TO is not set")
    return false
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildNotificationEmail(submission, { id, from, to, stored })),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      console.error(`Contact notification failed: Resend responded ${response.status}`)
      return false
    }
    return true
  } catch (error) {
    console.error("Contact notification failed:", error)
    return false
  }
}
