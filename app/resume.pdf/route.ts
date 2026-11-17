import { getCvUrl, getResumeContent } from "@/lib/api"
import { resumeData } from "@/lib/resume"
import { renderResumePdf } from "@/lib/resume-pdf"
import { siteConfig } from "@/lib/site"

/**
 * The résumé as a PDF, generated from the site's own content (lib/resume-pdf.tsx), so it's
 * never older than the site. Should drawing it ever fail, the PDF uploaded in the Studio (the
 * `cv` document) is served instead.
 *
 * Prerendered; refreshed with the content (`<SanityLive />`, the Sanity webhook) and at least
 * hourly.
 */
export const dynamic = "force-static"
export const revalidate = 3600

const FILENAME = `${siteConfig.name.replace(/\s+/g, "-")}-Resume.pdf`

const pdf = (body: ArrayBuffer | Uint8Array) =>
  new Response(body as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      // Opens in the browser's PDF viewer; saving uses a readable filename.
      "Content-Disposition": `inline; filename="${FILENAME}"`,
      "X-Robots-Tag": "noindex",
    },
  })

export async function GET() {
  try {
    const buffer = await renderResumePdf(resumeData(await getResumeContent(), new Date()))
    return pdf(new Uint8Array(buffer))
  } catch (error) {
    console.error("Couldn't draw the résumé; serving the uploaded PDF", error)
  }

  const source = await getCvUrl()
  const upstream = source ? await fetch(source) : null
  if (!upstream?.ok) return new Response("Résumé temporarily unavailable.", { status: 503 })
  return pdf(await upstream.arrayBuffer())
}
