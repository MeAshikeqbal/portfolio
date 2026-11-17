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
/**
 * Command-line clients (curl, wget, HTTPie, xh) asking for a page get it as plain text from
 * app/api/text: `curl -L itsashik.dev`. Only unprefixed (English) pages that have a text view;
 * anything asking for HTML gets HTML.
 */
const COMMAND_LINE = /^(curl|wget|httpie|xh)\//i
const TEXT_PAGES = /^\/(?:(?:post|projects)(?:\/[^/]+)?|homecave|now|resume)?$/

export function wantsText(request: NextRequest): boolean {
  const agent = request.headers.get("user-agent") ?? ""
  const accept = request.headers.get("accept") ?? ""
  return (
    COMMAND_LINE.test(agent) &&
    !accept.includes("text/html") &&
    TEXT_PAGES.test(request.nextUrl.pathname)
  )
}

export default function proxy(request: NextRequest) {
  if (DEFAULT_LOCALE_IMAGE.test(request.nextUrl.pathname)) return NextResponse.next()
  if (wantsText(request)) {
    const url = request.nextUrl.clone()
    url.pathname = `/api/text${request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname}`
    return NextResponse.rewrite(url)
  }
  return handleLocale(request)
}

export const config = {
  // Everything except API routes, the Studio, Next/Vercel internals, the icon route and any path
  // with a dot (rss.xml, sitemap.xml, robots.txt, *.asc, resume.pdf, favicons, .well-known…).
  matcher: ["/((?!(?:api|studio|_next|_vercel|icons)(?:/|$)|.*\\..*).*)"],
}
