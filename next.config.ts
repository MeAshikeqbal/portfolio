import type { NextConfig } from "next"

/**
 * Content Security Policy for the public site.
 *
 * Pages are statically prerendered, so per-request nonces aren't available and inline
 * scripts/styles (Next.js bootstrap, next/font, style attributes) need 'unsafe-inline'.
 * The policy still pins every other source to the services the site actually uses:
 * - Sanity: images from the CDN, Live Content API (EventSource) for content updates
 * - Cloudflare Turnstile: script + iframe for the contact form
 * - Vercel Analytics / Speed Insights: same-origin scripts and beacons under /_vercel
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.sanity.io",
  "font-src 'self'",
  "connect-src 'self' https://*.api.sanity.io https://*.apicdn.sanity.io wss://*.api.sanity.io",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ")

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()",
  },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Next 16 only serves listed qualities; keep in sync with `quality` props.
    qualities: [50, 60, 75],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "api.microlink.io",
      },
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The CSP only applies in production (React's dev tooling needs eval) and skips the
      // embedded Sanity Studio, which loads its own scripts, workers and API connections.
      ...(process.env.NODE_ENV === "production"
        ? [
            {
              source: "/((?!studio).*)",
              headers: [{ key: "Content-Security-Policy", value: csp }],
            },
          ]
        : []),
    ]
  },
}

export default nextConfig
