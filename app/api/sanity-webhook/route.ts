import { timingSafeEqual } from "crypto"
import { revalidatePath } from "next/cache"
import { after, type NextRequest, NextResponse } from "next/server"
import { defaultLocale, locales } from "@/i18n/locales"
import { revalidatePages } from "@/lib/revalidate"
import { isTranslatable } from "@/lib/translate/content"
import { deleteTranslations, translateDocument } from "@/lib/translate/document"
import { writeClient } from "@/sanity/lib/write-client"

/**
 * Sanity webhook: revalidates cached pages when content is published, and keeps the machine
 * translations in step.
 *
 * `<SanityLive />` already revalidates content while visitors are on the site;
 * this webhook is the backstop for changes published while nobody is browsing.
 * Expects `Authorization: Bearer <SANITY_WEBHOOK_SECRET>` and a projection of
 * `{_id, _type, "operation": delta::operation()}` (create, update and delete), for every
 * document type: translations included, so a written or hand-corrected translation shows.
 */
function isAuthorized(header: string | null, secret: string): boolean {
  if (!header) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(header)
  return expected.length === received.length && timingSafeEqual(expected, received)
}

// Translating a long post into six languages takes a few seconds; it runs after the response.
export const maxDuration = 60

/** Pages showing a document type, in every language. */
function revalidateFor(type: string | undefined) {
  switch (type) {
    case "post":
    case "category":
      // Every post page, so renamed or unpublished slugs stop serving stale copies.
      revalidatePages("/post", "/post/[slug]", "/")
      revalidatePath("/rss.xml")
      revalidatePath("/sitemap.xml")
      break
    case "project":
      revalidatePages("/projects", "/projects/[slug]", "/")
      revalidatePath("/sitemap.xml")
      break
    case "cv":
      revalidatePath("/resume.pdf")
      break
    default:
      revalidatePath("/", "layout")
  }
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

  let body: { _id?: string; _type?: string; operation?: string } = {}
  try {
    body = await req.json()
  } catch {
    // An empty or non-JSON body still triggers a full revalidation below.
  }

  // A translation was written (on publish, by the backfill, or corrected by hand): refresh the
  // pages that read it. Translations come from many types (a category's title shows on every
  // post), so every page; there's nothing to translate.
  if (body._type === "translation") {
    revalidatePath("/", "layout")
    return NextResponse.json({ revalidated: true, type: "translation" })
  }

  revalidateFor(body._type)

  const { _id: id, _type: type } = body
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY
  const targets = locales.filter((locale) => locale !== defaultLocale)
  if (id && type && isTranslatable(type) && targets.length > 0) {
    // After the response: Sanity's webhook times out long before a translation finishes, and
    // a retry would only find the work done (unchanged revision, translation memory).
    after(async () => {
      try {
        if (body.operation === "delete") {
          await deleteTranslations(id, writeClient)
        } else if (apiKey) {
          const result = await translateDocument(id, {
            client: writeClient,
            apiKey,
            locales: targets,
            maxChars: Number(process.env.TRANSLATE_MAX_CHARS) || undefined,
          })
          if (result.status !== "done") console.warn("Translation", result)
        } else {
          console.warn("GOOGLE_TRANSLATE_API_KEY is not set: not translating", id)
          return
        }
        revalidateFor(type)
      } catch (error) {
        console.error(`Couldn't translate ${id}:`, error)
      }
    })
  }

  return NextResponse.json({ revalidated: true, type: type ?? "all" })
}
