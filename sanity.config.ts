"use client"

/**
 * Sanity Studio, mounted at /studio by app/studio/[[...tool]]/page.tsx.
 */

import { visionTool } from "@sanity/vision"
import { defineConfig } from "sanity"
import { presentationTool } from "sanity/presentation"
import { structureTool } from "sanity/structure"

import { apiVersion, dataset, projectId } from "./sanity/env"
import { schema } from "./sanity/schemaTypes"
import { resolve } from "./sanity/presentation/resolve"
import { structure } from "./sanity/structure"
import { inboxDatasetName } from "./sanity/inbox/dataset"
import { inboxSchema } from "./sanity/inbox/schema"
import { inboxStructure } from "./sanity/inbox/structure"
import { dashboardTool } from "./sanity/dashboard"
import { isAdmin } from "./sanity/dashboard/logic"
import { StudioLogo } from "./sanity/components/studio-logo"
import { studioTheme } from "./sanity/theme"
import { InboxIcon, RssIcon } from "lucide-react"
import { media } from "sanity-plugin-media"
import { codeInput } from "@sanity/code-input"

/** Shared look for both workspaces. */
const shared = {
  projectId,
  theme: studioTheme,
  studio: { components: { logo: StudioLogo } },
}

/**
 * Two workspaces, switchable from the Studio's top-left menu:
 * - `content`: the public site's content (dataset `production`)
 * - `inbox`:   contact-form messages in a PRIVATE dataset, so they can't be read through the
 *              public API
 */
export default defineConfig([
  {
    ...shared,
    name: "content",
    basePath: "/studio/content",
    title: "itsashik.dev",
    icon: RssIcon,
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
    // Home dashboard first (the Studio opens on the first tool); Vision for admins only.
    tools: (prev, { currentUser }) => [
      dashboardTool,
      ...prev.filter((tool) => tool.name !== "vision" || isAdmin(currentUser)),
    ],
  },
  {
    ...shared,
    name: "inbox",
    basePath: "/studio/inbox",
    title: "Inbox",
    subtitle: "Contact messages (private)",
    icon: InboxIcon,
    dataset: inboxDatasetName,
    schema: inboxSchema,
    plugins: [structureTool({ structure: inboxStructure, title: "Inbox" })],
    document: {
      // Messages come from the contact form only.
      newDocumentOptions: () => [],
    },
  },
])
