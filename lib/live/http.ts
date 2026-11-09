import "server-only"

/** Upstreams get this long before we give up and show nothing for that integration. */
export const LIVE_TIMEOUT_MS = 3000

export type Fetch = typeof fetch
export type Env = Record<string, string | undefined>

export interface JsonResult<T> {
  status: number
  /** Parsed body for 2xx responses with content; null for 204 and errors. */
  data: T | null
}

/**
 * Fetches JSON with a timeout, uncached. Never throws: network errors, timeouts and malformed
 * JSON all come back as null, so one broken upstream can't take the others down.
 */
export async function getJson<T>(
  fetchImpl: Fetch,
  url: string,
  init: RequestInit = {},
): Promise<JsonResult<T> | null> {
  try {
    const response = await fetchImpl(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(LIVE_TIMEOUT_MS),
    })
    if (response.status === 204 || !response.ok) return { status: response.status, data: null }
    return { status: response.status, data: (await response.json()) as T }
  } catch {
    return null
  }
}

export function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

/** The URL if it's https on one of `hosts`, else null (upstream links never pass through raw). */
export function safeUrl(value: unknown, hosts: string[]): string | null {
  const raw = str(value)
  if (!raw) return null
  try {
    const url = new URL(raw)
    return url.protocol === "https:" && hosts.includes(url.hostname) ? url.toString() : null
  } catch {
    return null
  }
}

/** A valid ISO timestamp, or null. */
export function isoDate(value: unknown): string | null {
  const raw = typeof value === "number" ? new Date(value) : new Date(str(value) ?? NaN)
  return Number.isNaN(raw.getTime()) ? null : raw.toISOString()
}
