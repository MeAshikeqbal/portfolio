"use server"

import { randomUUID } from "node:crypto"
import { headers } from "next/headers"
import { after } from "next/server"
import { contactSchema, HONEYPOT_FIELD } from "@/lib/contact-schema"
import { buildMessageDocument } from "@/lib/inbox-message"
import { notifyNewMessage } from "@/lib/notify"
import { inboxClient } from "@/sanity/lib/inbox-client"

type Field = "name" | "email" | "message" | "turnstileToken"

export interface ContactState {
  status: "idle" | "success" | "error"
  message?: string
  fieldErrors?: Partial<Record<Field, string>>
  /** Echoed back on error so the form keeps what the visitor typed. */
  values?: { name: string; email: string; message: string }
}

/** Turnstile injects its token into the form under this name. */
const TURNSTILE_FIELD = "cf-turnstile-response"

/**
 * Server action for the contact form (`useActionState`). Works without JavaScript:
 * the form posts natively and errors come back as state.
 */
export async function submitContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    message: String(formData.get("message") ?? ""),
  }

  // Bots fill every field; pretend it worked so they don't adapt.
  if (formData.get(HONEYPOT_FIELD)) return { status: "success" }

  const parsed = contactSchema.safeParse({
    ...values,
    turnstileToken: String(formData.get(TURNSTILE_FIELD) ?? ""),
  })
  if (!parsed.success) {
    const fieldErrors: ContactState["fieldErrors"] = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as Field
      fieldErrors[field] ??= issue.message
    }
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors, values }
  }

  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY
  if (!secret) {
    console.error("CLOUDFLARE_TURNSTILE_SECRET_KEY is not set")
    return { status: "error", message: "The contact form isn't configured right now.", values }
  }

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim()
  const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: parsed.data.turnstileToken, remoteip: ip }),
  })
    .then((res) => res.json() as Promise<{ success: boolean }>)
    .catch(() => ({ success: false }))

  if (!verification.success) {
    return {
      status: "error",
      message: "The anti-spam check failed. Please try again.",
      fieldErrors: { turnstileToken: "Please complete the check again." },
      values,
    }
  }

  const { name, email, message } = parsed.data
  const submission = { name, email, message }
  const id = randomUUID()

  // Messages go to the PRIVATE inbox dataset, never the public one (names and emails are
  // personal data). If storing fails, the email notification becomes the only copy, so it's
  // sent before responding; otherwise it's sent after the response, off the critical path.
  let stored = false
  try {
    await inboxClient.create(buildMessageDocument(submission, { id }))
    stored = true
  } catch (error) {
    console.error("Couldn't store contact message in the inbox dataset:", error)
  }

  if (stored) {
    after(() => notifyNewMessage(submission, { id, stored }))
    return { status: "success" }
  }

  if (await notifyNewMessage(submission, { id, stored })) {
    return { status: "success" }
  }

  return {
    status: "error",
    message: "Couldn't send your message. Please try again later.",
    values,
  }
}
