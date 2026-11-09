import { draftMode } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

/** Leaves draft mode and returns to `?redirect=` (same-site paths only), or the home page. */
export async function GET(request: NextRequest) {
  ;(await draftMode()).disable()
  const target = request.nextUrl.searchParams.get("redirect") ?? "/"
  // Only local paths: "//evil.com" or "https://…" would be an open redirect.
  const safe = target.startsWith("/") && !target.startsWith("//") ? target : "/"
  return NextResponse.redirect(new URL(safe, request.url))
}
