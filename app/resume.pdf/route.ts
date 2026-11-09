import { getCvUrl } from "@/lib/api"
import { siteConfig } from "@/lib/site"

/**
 * Serves the CV uploaded in Sanity (the `cv` document) from our own domain at /resume.pdf,
 * so visitors never see a cdn.sanity.io URL.
 *
 * Prerendered at build time; publishing a new CV refreshes it via `<SanityLive />` and the
 * Sanity webhook (app/api/sanity-webhook).
 */
export const dynamic = "force-static"

const FILENAME = `${siteConfig.name.replace(/\s+/g, "-")}-Resume.pdf`

export async function GET() {
  const source = await getCvUrl()
  if (!source) {
    return new Response("Résumé not available.", { status: 404 })
  }

  const upstream = await fetch(source)
  if (!upstream.ok) {
    return new Response("Résumé temporarily unavailable.", { status: 502 })
  }

  return new Response(await upstream.arrayBuffer(), {
    headers: {
      "Content-Type": "application/pdf",
      // Opens in the browser's PDF viewer; saving uses a readable filename.
      "Content-Disposition": `inline; filename="${FILENAME}"`,
      "X-Robots-Tag": "noindex",
    },
  })
}
