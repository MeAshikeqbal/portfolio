import { OpenIcon, ResetIcon, SyncIcon } from "../components/icons"
import { useToast } from "@sanity/ui/toast"
import { useState } from "react"
import { useClient, type DocumentActionComponent } from "sanity"

import { sitePath } from "../presentation/paths"
import { describeSync, requestGitHubSync } from "./request-github-sync"
import { buildNewUpdateDraft, newUpdateBlocker, type PublishedNow } from "./now-update"
import { todayIso } from "../schemaTypes/nowType"

const API_VERSION = "2026-11-01"

/** Opens the published page for a post, project, /uses or /now in a new tab. */
export const OpenOnSiteAction: DocumentActionComponent = ({ type, published }) => {
  const slug = (published as { slug?: { current?: string } } | null)?.slug?.current
  const path = published ? sitePath(type, slug) : null
  return {
    label: "Open on site",
    icon: OpenIcon,
    disabled: !path,
    title: path ? `Open ${path} in a new tab` : "Publish first: there's no live page yet",
    onHandle: () => {
      if (path) window.open(new URL(path, window.location.origin), "_blank", "noopener")
    },
  }
}

/** Pulls stars, commits, language and activity for this project from GitHub now. */
export const SyncFromGitHubAction: DocumentActionComponent = ({ draft, published, onComplete }) => {
  const client = useClient({ apiVersion: API_VERSION })
  const toast = useToast()
  const [syncing, setSyncing] = useState(false)

  const github = ((draft ?? published) as { github?: string } | null)?.github
  // Both versions, so publishing the draft later doesn't bring back stale numbers.
  const ids = [published?._id, draft?._id].filter((id): id is string => Boolean(id))

  return {
    label: syncing ? "Syncing…" : "Sync from GitHub",
    icon: SyncIcon,
    disabled: syncing || !github || ids.length === 0,
    title: github ? "Fetch the latest stats from GitHub" : "Add a GitHub repository URL first",
    onHandle: async () => {
      setSyncing(true)
      try {
        const result = await requestGitHubSync(client, ids)
        toast.push({
          status: result.failed.length ? "error" : "success",
          title: result.failed.length ? "GitHub sync failed" : "Synced from GitHub",
          description: describeSync(result, 1),
        })
      } catch (error) {
        toast.push({
          status: "error",
          title: "GitHub sync failed",
          description: error instanceof Error ? error.message : String(error),
        })
      } finally {
        setSyncing(false)
        onComplete()
      }
    },
  }
}

/**
 * /now: moves the published update into "Previous updates" and dates a new draft today, so
 * writing the next update never loses the last one. The draft starts as a copy of the old
 * text; rewrite it, then publish.
 */
export const StartNowUpdateAction: DocumentActionComponent = ({ draft, published, onComplete }) => {
  const client = useClient({ apiVersion: API_VERSION })
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const today = todayIso()
  const current = published as PublishedNow | null
  const blocker = newUpdateBlocker(current, Boolean(draft), today)

  return {
    label: busy ? "Starting…" : "Start a new update",
    icon: ResetIcon,
    disabled: busy || blocker !== null,
    title: blocker ?? "Archive the published update and start a new one dated today",
    onHandle: async () => {
      if (!current) return
      setBusy(true)
      try {
        // createIfNotExists: if a draft appeared since this button rendered, nothing is lost.
        await client.createIfNotExists(buildNewUpdateDraft(current, today) as never)
        toast.push({
          status: "success",
          title: "New update started",
          description: "The last one is under Previous updates. Rewrite the text, then publish.",
        })
      } catch (error) {
        toast.push({
          status: "error",
          title: "Couldn't start a new update",
          description: error instanceof Error ? error.message : String(error),
        })
      } finally {
        setBusy(false)
        onComplete()
      }
    },
  }
}
