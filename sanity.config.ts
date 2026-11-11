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
import { TYPES_WITH_PAGES } from "./sanity/presentation/paths"
import { resolve } from "./sanity/presentation/resolve"
import { structure } from "./sanity/structure"
import { inboxDatasetName } from "./sanity/inbox/dataset"
import { inboxSchema } from "./sanity/inbox/schema"
import { inboxStructure } from "./sanity/inbox/structure"
import { OpenOnSiteAction, StartNowUpdateAction, SyncFromGitHubAction } from "./sanity/actions"
import {
  MessageStateBadge,
  NowStaleBadge,
  PostStateBadge,
  ProjectStatusBadge,
} from "./sanity/badges"
import { dashboardTool } from "./sanity/dashboard"
import { isAdmin } from "./sanity/dashboard/logic"
import { StudioLogo } from "./sanity/components/studio-logo"
import { StudioNavbar } from "./sanity/components/statusline"
import { studioTheme } from "./sanity/theme"
import { InboxWorkspaceIcon, SiteWorkspaceIcon } from "./sanity/components/icons"
import { media } from "sanity-plugin-media"
import { codeInput } from "@sanity/code-input"

/** One-off documents with fixed ids (see sanity/structure.ts): no create, delete or duplicate. */
const SINGLETONS = new Set(["cv", "uses", "now"])
const SINGLETON_ACTIONS = new Set(["publish", "discardChanges", "restore"])

/** Shared look for both workspaces: theme, wordmark and the statusline under the navbar. */
const shared = {
  projectId,
  theme: studioTheme,
  studio: { components: { logo: StudioLogo, navbar: StudioNavbar } },
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
    icon: SiteWorkspaceIcon,
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
    document: {
      newDocumentOptions: (prev, { creationContext }) =>
        creationContext.type === "global"
          ? prev.filter((item) => !SINGLETONS.has(item.templateId))
          : prev,
      actions: (prev, { schemaType }) => {
        const actions = SINGLETONS.has(schemaType)
          ? prev.filter(({ action }) => action && SINGLETON_ACTIONS.has(action))
          : prev
        return [
          ...actions,
          ...(TYPES_WITH_PAGES.has(schemaType) ? [OpenOnSiteAction] : []),
          ...(schemaType === "project" ? [SyncFromGitHubAction] : []),
          ...(schemaType === "now" ? [StartNowUpdateAction] : []),
        ]
      },
      // The site's status vocabulary in the editor header (see sanity/badges/logic.ts).
      badges: (prev, { schemaType }) => [
        ...prev,
        ...(schemaType === "project" ? [ProjectStatusBadge] : []),
        ...(schemaType === "post" ? [PostStateBadge] : []),
        ...(schemaType === "now" ? [NowStaleBadge] : []),
      ],
    },
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
    icon: InboxWorkspaceIcon,
    dataset: inboxDatasetName,
    schema: inboxSchema,
    plugins: [structureTool({ structure: inboxStructure, title: "Inbox" })],
    document: {
      // Messages come from the contact form only.
      newDocumentOptions: () => [],
      badges: (prev, { schemaType }) =>
        schemaType === "message" ? [...prev, MessageStateBadge] : prev,
    },
  },
])
