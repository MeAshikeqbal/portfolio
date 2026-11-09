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
import { inboxSchema } from "./sanity/inbox/schema"
import { inboxStructure } from "./sanity/inbox/structure"
import { InboxIcon, RssIcon } from "lucide-react"
import { media } from "sanity-plugin-media"
import { codeInput } from "@sanity/code-input"

/** Private dataset for contact-form messages (see sanity/lib/inbox-client.ts). */
const inboxDataset = process.env.NEXT_PUBLIC_SANITY_INBOX_DATASET || "inbox"

/**
 * Two workspaces, switchable from the Studio's top-left menu:
 * - `content`: the public site's content (dataset `production`)
 * - `inbox`:   contact-form messages in a PRIVATE dataset, so they can't be read through the
 *              public API
 */
export default defineConfig([
  {
    name: "content",
    basePath: "/studio/content",
    title: "Portfolio Studio",
    icon: RssIcon,
    projectId,
    dataset,
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
      visionTool({ defaultApiVersion: apiVersion }),
      media(),
      codeInput(),
    ],
  },
  {
    name: "inbox",
    basePath: "/studio/inbox",
    title: "Inbox",
    subtitle: "Contact messages (private)",
    icon: InboxIcon,
    projectId,
    dataset: inboxDataset,
    schema: inboxSchema,
    plugins: [structureTool({ structure: inboxStructure, title: "Inbox" })],
    document: {
      // Messages come from the contact form only.
      newDocumentOptions: () => [],
    },
  },
])
