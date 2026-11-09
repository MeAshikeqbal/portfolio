import { renderIconSvg } from "@/lib/icons"

/** Shown for unknown icon names so a typo in the CMS doesn't render a broken image. */
const FALLBACK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M8 3a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2H3v2h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h2v-2H8v-5a2 2 0 0 0-2-2a2 2 0 0 0 2-2V5h2V3m6 0a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1v2h-1a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-2v-2h2v-5a2 2 0 0 1 2-2a2 2 0 0 1-2-2V5h-2V3z"/></svg>'

/**
 * Serves bundled Iconify icons as same-origin SVGs: `/icons/logos/aws.svg`.
 * Same-origin matters: CSS `mask-image` (used for theme-coloured icons) requires CORS for
 * cross-origin URLs, and self-hosting avoids the public Iconify API's rate limits.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ prefix: string; icon: string }> },
) {
  const { prefix, icon } = await params
  const svg = await renderIconSvg(prefix, icon.replace(/\.svg$/, ""))

  return new Response(svg ?? FALLBACK_SVG, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": svg
        ? "public, max-age=31536000, immutable"
        : "public, max-age=300, s-maxage=300",
      "X-Content-Type-Options": "nosniff",
      // Lets the Studio's content-health check tell a real icon from the fallback.
      "X-Icon-Found": svg ? "1" : "0",
    },
  })
}
