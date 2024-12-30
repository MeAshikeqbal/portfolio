'use server'

import { z } from 'zod'
import { client } from '@/sanity/lib/client'

const formSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(10),
  turnstileToken: z.string().min(1),
})

export async function submitContact(formData: z.infer<typeof formSchema>) {
  const validatedFields = formSchema.safeParse(formData)

  if (!validatedFields.success) {
    return { success: false, error: 'Invalid form data' }
  }

  const { name, email, message, turnstileToken } = validatedFields.data

  // Verify Cloudflare Turnstile token
  const turnstileResponse = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY,
        response: turnstileToken,
      }),
    }
  )

  const turnstileData = await turnstileResponse.json()

  if (!turnstileData.success) {
    return { success: false, error: 'Turnstile verification failed' }
  }

  try {
    await client.create({
      _type: 'contact',
      name,
      email,
      message,
    })

    return { success: true }
  } catch (error) {
    console.error('Error submitting contact form:', error)
    return { success: false, error: 'Failed to submit the form' }
  }
}

