"use server"

import { writeClient } from "@/sanity/lib/write-client"
import { contactSchema, type ContactInput } from "@/lib/contact-schema"

export async function submitContact(formData: ContactInput) {
  const validatedFields = contactSchema.safeParse(formData)

  if (!validatedFields.success) {
    return { success: false, error: "Invalid form data" }
  }

  const { name, email, message, turnstileToken } = validatedFields.data

  // Verify Cloudflare Turnstile token
  const turnstileResponse = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret: process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY,
        response: turnstileToken,
      }),
    },
  )

  const turnstileData = await turnstileResponse.json()

  if (!turnstileData.success) {
    return { success: false, error: "Turnstile verification failed" }
  }

  try {
    await writeClient.create({
      _type: "contact",
      name,
      email,
      message,
    })

    return { success: true }
  } catch (error) {
    console.error("Error submitting contact form:", error)
    return { success: false, error: "Failed to submit the form" }
  }
}
