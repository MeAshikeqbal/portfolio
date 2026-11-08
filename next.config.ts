import type { NextConfig } from "next"

const nextConfig: NextConfig = {
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
}

export default nextConfig
