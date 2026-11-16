"use server"

import { randomUUID } from "node:crypto"
import { headers } from "next/headers"
import { TURNSTILE_ACTION } from "@/lib/contact-fields"
import { contactSchema, HONEYPOT_FIELD, type ContactErrorCode } from "@/lib/contact-schema"
import { buildMessageDocument } from "@/lib/inbox-message"
import { verifyTurnstile } from "@/lib/turnstile"
import { inboxClient } from "@/sanity/lib/inbox-client"

type Field = "name" | "email" | "message" | "turnstileToken"

export interface ContactState {
  status: "idle" | "success" | "error"
  /** Error codes, translated by the form (messages: contact.errors.*). */
  message?: ContactErrorCode
  fieldErrors?: Partial<Record<Field, ContactErrorCode>>
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
      fieldErrors[field] ??= issue.message as ContactErrorCode
    }
    return { status: "error", message: "fixFields", fieldErrors, values }
  }

  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY
  if (!secret) {
    console.error("CLOUDFLARE_TURNSTILE_SECRET_KEY is not set")
    return { status: "error", message: "notConfigured", values }
  }

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim()
  const verified = await verifyTurnstile({
    secret,
    token: parsed.data.turnstileToken,
    expectedAction: TURNSTILE_ACTION,
    remoteIp: ip,
  })

  if (!verified) {
    return {
      status: "error",
      message: "spamFailed",
      fieldErrors: { turnstileToken: "challengeAgain" },
      values,
    }
  }

  const { name, email, message } = parsed.data

  // Messages go to the PRIVATE inbox dataset, never the public one (names and emails are
  // personal data). They show up in the Studio's Inbox workspace.
  try {
    await inboxClient.create(buildMessageDocument({ name, email, message }, { id: randomUUID() }))
    return { status: "success" }
  } catch (error) {
    console.error("Couldn't store contact message in the inbox dataset:", error)
    return {
      status: "error",
      message: "sendFailed",
      values,
    }
  }
}
