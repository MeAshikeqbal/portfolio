import createMiddleware from "next-intl/middleware"
import { NextResponse, type NextRequest } from "next/server"
import { defaultLocale } from "./i18n/locales"
import { routing } from "./i18n/routing"

const handleLocale = createMiddleware(routing)

/**
 * Next names a page's generated share images after the route they live in, so an English page's
 * og:image is /en/…/opengraph-image. Those URLs are served as they are: redirecting them to the
 * unprefixed path would cost every crawler an extra hop for the same image.
 */
const DEFAULT_LOCALE_IMAGE = new RegExp(`^/${defaultLocale}(/.*)?/(opengraph|twitter)-image`)

/**
 * Locale routing: rewrites unprefixed URLs to the English tree (app/[lang] with lang=en),
 * passes /hi, /ja… through, and redirects /en/... to the unprefixed URL.
 */
export default function proxy(request: NextRequest) {
  if (DEFAULT_LOCALE_IMAGE.test(request.nextUrl.pathname)) return NextResponse.next()
  return handleLocale(request)
}

export const config = {
  // Everything except API routes, the Studio, Next/Vercel internals, the icon route and any path
  // with a dot (rss.xml, sitemap.xml, robots.txt, *.asc, resume.pdf, favicons, .well-known…).
  matcher: ["/((?!(?:api|studio|_next|_vercel|icons)(?:/|$)|.*\\..*).*)"],
}
