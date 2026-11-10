import {
  defineDocuments,
  defineLocations,
  type PresentationPluginOptions,
} from "sanity/presentation"

import { sitePath } from "./paths"

/**
 * Tells the Presentation tool which page(s) show each document, and which document a page
 * is "about", so editors can jump between content and its live preview.
 */
const home = { title: "Home", href: "/" }

export const resolve: PresentationPluginOptions["resolve"] = {
  mainDocuments: defineDocuments([
    { route: "/post/:slug", filter: `_type == "post" && slug.current == $slug` },
    { route: "/projects/:slug", filter: `_type == "project" && slug.current == $slug` },
    { route: "/homecave", filter: `_type == "uses" && _id == "uses"` },
    { route: "/now", filter: `_type == "now" && _id == "now"` },
  ]),
  locations: {
    post: defineLocations({
      select: { title: "title", slug: "slug.current" },
      resolve: (doc) => ({
        locations: [
          { title: doc?.title || "Untitled post", href: sitePath("post", doc?.slug) ?? "/post" },
          { title: "Writing", href: "/post" },
          home,
        ],
      }),
    }),
    project: defineLocations({
      select: { title: "title", slug: "slug.current" },
      resolve: (doc) => ({
        locations: [
          ...(doc?.slug
            ? [{ title: doc.title || "Untitled project", href: sitePath("project", doc.slug)! }]
            : []),
          { title: "Projects", href: "/projects" },
          home,
        ],
      }),
    }),
    skills: defineLocations({ locations: [home] }),
    education: defineLocations({ locations: [home] }),
    experiences: defineLocations({ locations: [home] }),
    cv: defineLocations({ locations: [home] }),
    uses: defineLocations({ locations: [{ title: "Homecave", href: "/homecave" }] }),
    now: defineLocations({ locations: [{ title: "Now", href: "/now" }] }),
  },
}
