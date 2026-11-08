import { timingSafeEqual } from "crypto"
import { revalidatePath } from "next/cache"
import { type NextRequest, NextResponse } from "next/server"

/**
 * Sanity webhook: revalidates cached pages when content is published.
 *
 * `<SanityLive />` already revalidates content while visitors are on the site;
 * this webhook is the backstop for changes published while nobody is browsing.
 * Expects `Authorization: Bearer <SANITY_WEBHOOK_SECRET>`.
 */
function isAuthorized(header: string | null, secret: string): boolean {
  if (!header) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(header)
  return expected.length === received.length && timingSafeEqual(expected, received)
}

export async function POST(req: NextRequest) {
  const secret = process.env.SANITY_WEBHOOK_SECRET
  if (!secret) {
    console.error("SANITY_WEBHOOK_SECRET is not set")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  if (!isAuthorized(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { _type?: string; slug?: { current?: string } | string } = {}
  try {
    body = await req.json()
  } catch {
    // An empty or non-JSON body still triggers a full revalidation below.
  }

  const slug = typeof body.slug === "string" ? body.slug : body.slug?.current

  switch (body._type) {
    case "post":
      revalidatePath("/post")
      if (slug) revalidatePath(`/post/${slug}`)
      revalidatePath("/rss.xml")
      revalidatePath("/sitemap.xml")
      revalidatePath("/")
      break
    case "project":
      revalidatePath("/projects")
      if (slug) revalidatePath(`/projects/${slug}`)
      revalidatePath("/sitemap.xml")
      revalidatePath("/")
      break
    default:
      revalidatePath("/", "layout")
  }

  return NextResponse.json({ revalidated: true, type: body._type ?? "all" })
}
