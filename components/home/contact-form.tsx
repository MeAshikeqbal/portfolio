"use client"

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"
import { CircleCheck } from "lucide-react"
import { useActionState, useEffect, useRef, type ReactNode } from "react"
import { submitContact, type ContactState } from "@/actions/submit-contact"
import { HONEYPOT_FIELD } from "@/lib/contact-fields"
import { StatusPill } from "@/components/dashboard/status-pill"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const siteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContact, {
    status: "idle",
  })
  const turnstile = useRef<TurnstileInstance>(null)

  // A Turnstile token is single-use: get a fresh one after any failed attempt.
  useEffect(() => {
    if (state.status === "error") turnstile.current?.reset()
  }, [state])

  if (state.status === "success") {
    return (
      <div role="status" className="flex flex-col items-start gap-3 py-6">
        <StatusPill status="up">ticket received</StatusPill>
        <p className="flex items-center gap-2 text-lg font-medium">
          <CircleCheck className="size-5 text-status-up-fg" aria-hidden /> Thanks, your message is
          in.
        </p>
        <p className="text-muted-foreground">I&apos;ll get back to you by email.</p>
      </div>
    )
  }

  const errors = state.fieldErrors ?? {}

  return (
    <form action={action} className="space-y-5">
      <Field id="contact-name" label="Name" error={errors.name}>
        <Input
          id="contact-name"
          name="name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
          defaultValue={state.values?.name}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "contact-name-error" : undefined}
        />
      </Field>
      <Field id="contact-email" label="Email" error={errors.email}>
        <Input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          defaultValue={state.values?.email}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "contact-email-error" : undefined}
        />
      </Field>
      <Field id="contact-message" label="Message" error={errors.message}>
        <Textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={5}
          defaultValue={state.values?.message}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "contact-message-error" : undefined}
        />
      </Field>

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden className="hidden">
        <label>
          Leave this field empty
          <input name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {siteKey ? (
        <Turnstile
          ref={turnstile}
          siteKey={siteKey}
          options={{ theme: "auto", size: "flexible" }}
        />
      ) : (
        <p
          role="note"
          className="rounded-md bg-status-warn-soft px-3 py-2 text-sm text-status-warn-fg"
        >
          The contact form is unavailable right now. Please reach me through one of the other
          channels instead.
        </p>
      )}
      {errors.turnstileToken && (
        <p className="text-sm text-status-down-fg">{errors.turnstileToken}</p>
      )}

      {state.status === "error" && state.message && (
        <p
          role="alert"
          className="rounded-md bg-status-down-soft px-3 py-2 text-sm text-status-down-fg"
        >
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending || !siteKey} className="w-full sm:w-auto">
        {pending ? "Sending…" : "Submit ticket"}
      </Button>
    </form>
  )
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-status-down-fg">
          {error}
        </p>
      )}
    </div>
  )
}
