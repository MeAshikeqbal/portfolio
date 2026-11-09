/**
 * This route is responsible for the built-in authoring environment using Sanity Studio.
 * All routes under your studio path is handled by this file using Next.js' catch-all routes:
 * https://nextjs.org/docs/routing/dynamic-routes#catch-all-routes
 *
 * You can learn more about the next-sanity package here:
 * https://github.com/sanity-io/next-sanity
 */

import { NextStudio } from "next-sanity/studio"
import config from "../../../sanity.config"

export const dynamic = "force-static"

import { metadata as studioMetadata } from "next-sanity/studio"
import type { Metadata } from "next"

export { viewport } from "next-sanity/studio"

export const metadata: Metadata = {
  ...studioMetadata,
  title: { absolute: "Studio · itsashik.dev" },
}

export default function StudioPage() {
  return <NextStudio config={config} />
}
