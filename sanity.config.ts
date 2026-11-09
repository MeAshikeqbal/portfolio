"use client"

/**
 * This configuration is used to for the Sanity Studio that’s mounted on the `\app\studio\[[...tool]]\page.tsx` route
 */

import { visionTool } from "@sanity/vision"
import { defineConfig } from "sanity"
import { presentationTool } from "sanity/presentation"
import { structureTool } from "sanity/structure"

// Go to https://www.sanity.io/docs/api-versioning to learn how API versioning works
import { apiVersion, dataset, projectId } from "./sanity/env"
import { schema } from "./sanity/schemaTypes"
import { resolve } from "./sanity/presentation/resolve"
import { structure } from "./sanity/structure"
import { RssIcon } from "lucide-react"
import { media } from "sanity-plugin-media"
import { codeInput } from "@sanity/code-input"

export default defineConfig({
  basePath: "/studio",
  name: "PortfolioStudio",
  title: "Portfolio Studio",
  icon: RssIcon,
  projectId,
  dataset,
  // Add and edit the content schema in the './sanity/schemaTypes' folder
  schema,
  plugins: [
    structureTool({ structure }),
    // Live, click-through previews of drafts on the real site (needs SANITY_API_READ_TOKEN).
    presentationTool({
      resolve,
      previewUrl: {
        previewMode: {
          enable: "/api/draft-mode/enable",
          disable: "/api/draft-mode/disable",
        },
      },
    }),
    // Vision is for querying with GROQ from inside the Studio
    // https://www.sanity.io/docs/the-vision-plugin
    visionTool({ defaultApiVersion: apiVersion }),

    media(),
    codeInput(),
  ],
})
