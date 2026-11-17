import { timingSafeEqual } from "crypto"
import type { NextRequest } from "next/server"

/**
 * Vercel Cron calls with `Authorization: Bearer $CRON_SECRET`; anyone else gets a 401.
 * `next dev` skips the check, so a cron route can be tried locally.
 */
export function isCronAuthorized(req: NextRequest): boolean {
  if (process.env.NODE_ENV === "development") return true
  const secret = process.env.CRON_SECRET
  const header = req.headers.get("authorization")
  if (!secret || !header) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(header)
  return expected.length === received.length && timingSafeEqual(expected, received)
}
