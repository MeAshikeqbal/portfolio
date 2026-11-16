import { z } from "zod"

/**
 * Every error the contact form can show. The schema and the server action return these codes,
 * and the form translates them (messages: contact.errors.*), so one schema serves every locale.
 */
export type ContactErrorCode =
  | "nameTooShort"
  | "nameTooLong"
  | "emailInvalid"
  | "messageTooShort"
  | "messageTooLong"
  | "challengeMissing"
  | "challengeAgain"
  | "fixFields"
  | "notConfigured"
  | "spamFailed"
  | "sendFailed"

const error = (code: ContactErrorCode) => ({ error: code })

/** Contact form schema, shared by the client form and the server action. */
export const contactSchema = z.object({
  name: z.string().trim().min(2, error("nameTooShort")).max(100, error("nameTooLong")),
  email: z.email(error("emailInvalid")).max(254, error("emailInvalid")),
  message: z.string().trim().min(10, error("messageTooShort")).max(5000, error("messageTooLong")),
  turnstileToken: z
    .string()
    .min(1, error("challengeMissing"))
    // Cloudflare's documented maximum; anything longer isn't a real token.
    .max(2048, error("challengeAgain")),
})

export type ContactInput = z.infer<typeof contactSchema>

export { HONEYPOT_FIELD } from "./contact-fields"
