"use client"

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"
import { CircleCheck, LoaderCircle } from "lucide-react"
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react"
import { submitContact, type ContactState } from "@/actions/submit-contact"
import { HONEYPOT_FIELD } from "@/lib/contact-fields"
import { StatusPill } from "@/components/dashboard/status-pill"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

const siteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContact, {
    status: "idle",
  })
  const turnstile = useRef<TurnstileInstance>(null)
  // Cloudflare's widget arrives a moment after the form: hold its space with a skeleton.
  const [challenge, setChallenge] = useState<"loading" | "ready" | "failed">("loading")

  // A Turnstile token is single-use: get a fresh one after any failed attempt.
  useEffect(() => {
    if (state.status === "error") turnstile.current?.reset()
  }, [state])

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="flex animate-in flex-col items-start gap-3 py-6 duration-300 fade-in-0 motion-safe:slide-in-from-bottom-2"
      >
        <StatusPill status="up">message sent</StatusPill>
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
        <div className="relative min-h-[65px]">
          {challenge !== "ready" && (
            <div className="absolute inset-0 flex items-center gap-3 rounded-md border px-3">
              {challenge === "loading" && <Skeleton className="size-6 shrink-0 rounded-full" />}
              <p role="status" className="text-sm text-muted-foreground">
                {challenge === "failed"
                  ? "The spam check couldn't load. Refresh the page, or use another channel."
                  : "Loading spam check…"}
              </p>
            </div>
          )}
          <Turnstile
            ref={turnstile}
            siteKey={siteKey}
            options={{ theme: "auto", size: "flexible" }}
            onWidgetLoad={() => setChallenge("ready")}
            onError={() => setChallenge("failed")}
          />
        </div>
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
          {/* The challenge has no field to point at, so its error is read out with the banner. */}
          {errors.turnstileToken && <span className="sr-only"> {errors.turnstileToken}</span>}
        </p>
      )}

      <Button type="submit" disabled={pending || !siteKey} className="w-full sm:w-auto">
        {pending && <LoaderCircle aria-hidden className="motion-safe:animate-spin" />}
        {pending ? "Sending…" : "Send message"}
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
