import type { MetadataRoute } from "next"
import { siteConfig } from "@/lib/site"

/** Web app manifest; colours match the dark `--background` token in app/globals.css. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} — ${siteConfig.role}`,
    short_name: "itsashik",
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0c",
    theme_color: "#0a0a0c",
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  }
}
