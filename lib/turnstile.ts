import "server-only"
import { siteConfig } from "@/lib/site"

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

/** Cloudflare's documented maximum token length. */
export const TURNSTILE_TOKEN_MAX_LENGTH = 2048

interface SiteverifyResponse {
  success: boolean
  action?: string
  hostname?: string
  "error-codes"?: string[]
}

/**
 * Hostnames a token may have been issued on. Defaults to the production host; override with a
 * comma-separated CLOUDFLARE_TURNSTILE_HOSTNAMES (e.g. `localhost,example.com` for local dev
 * with Cloudflare's test keys, whose tokens always report `example.com`).
 */
export function allowedHostnames(): string[] {
  const configured = process.env.CLOUDFLARE_TURNSTILE_HOSTNAMES?.split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
  return configured?.length ? configured : [new URL(siteConfig.url).hostname]
}

/**
 * Checks a Turnstile token with Siteverify. Passes only when Cloudflare says the token is
 * valid AND it was issued for `expectedAction` on one of our hostnames, so a token solved on
 * another site or another form using the same sitekey is rejected. Fails closed on any error.
 */
export async function verifyTurnstile({
  secret,
  token,
  expectedAction,
  remoteIp,
}: {
  secret: string
  token: string
  expectedAction: string
  remoteIp?: string
}): Promise<boolean> {
  if (!token || token.length > TURNSTILE_TOKEN_MAX_LENGTH) return false

  let result: SiteverifyResponse
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, remoteip: remoteIp }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      console.error(`Turnstile Siteverify returned HTTP ${res.status}`)
      return false
    }
    result = (await res.json()) as SiteverifyResponse
  } catch (error) {
    console.error("Turnstile Siteverify request failed:", error)
    return false
  }

  if (result.success !== true) {
    // Config problems (bad secret, sitekey mismatch) need fixing; bad tokens are routine.
    const codes = result["error-codes"] ?? []
    if (codes.includes("missing-input-secret") || codes.includes("invalid-input-secret")) {
      console.error("Turnstile rejected the secret key:", codes.join(", "))
    }
    return false
  }
  if (result.action !== expectedAction) return false
  if (!result.hostname || !allowedHostnames().includes(result.hostname.toLowerCase())) return false
  return true
}
