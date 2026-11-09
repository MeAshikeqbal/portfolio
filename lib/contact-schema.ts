import { z } from "zod"

/** Contact form schema, shared by the client form and the server action. */
export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Name must be at least 2 characters." })
    .max(100, { error: "Name must be at most 100 characters." }),
  email: z.email({ error: "Please enter a valid email address." }).max(254),
  message: z
    .string()
    .trim()
    .min(10, { error: "Message must be at least 10 characters." })
    .max(5000, { error: "Message must be at most 5000 characters." }),
  turnstileToken: z
    .string()
    .min(1, { error: "Please complete the Cloudflare Turnstile challenge." }),
})

export type ContactInput = z.infer<typeof contactSchema>

export { HONEYPOT_FIELD } from "./contact-fields"
