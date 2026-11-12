import type { Metadata } from "next"
import { absoluteUrl, siteConfig } from "@/lib/site"

type OpenGraph = NonNullable<Metadata["openGraph"]>

interface PageMetadataInput {
  title: string
  description: string
  /** Site path like `/post`, used for the canonical URL and `og:url`. */
  path: string
  /** Extra Open Graph fields (e.g. `type: "article"`, `publishedTime`). */
  openGraph?: Partial<OpenGraph>
}

/**
 * A page's title, description, canonical URL and the matching Open Graph and Twitter fields.
 *
 * Next merges `openGraph` and `twitter` shallowly: a page that sets neither inherits the root
 * layout's site-wide title and URL, and a page that sets them drops the root's `siteName` and
 * `locale`. This repeats both. It never sets images: each segment's `opengraph-image.tsx`
 * supplies those, and file-based metadata wins over this object.
 */
export function pageMetadata({ title, description, path, openGraph }: PageMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      siteName: `${siteConfig.name} Portfolio`,
      url: absoluteUrl(path),
      title,
      description,
      ...openGraph,
    } as OpenGraph,
    twitter: {
      card: "summary_large_image",
      creator: siteConfig.twitterHandle,
      title,
      description,
    },
  }
}

/** /homecave's description, shared by the page's metadata and its share card. */
export const HOMECAVE_DESCRIPTION =
  "Ashik Eqbal's homelab, live: a three-node Proxmox cluster's health, load, storage and services, anonymized."
