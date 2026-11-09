/**
 * "Sync from GitHub" requests from the Studio. The Studio stamps `githubSyncRequestedAt` on
 * a project (which needs the editor's own write access), then calls /api/github-sync. The
 * route only syncs projects with a fresh stamp and clears it afterwards, so the route itself
 * can be public: without write access to the dataset, calling it does nothing.
 */

/** How long a request stays valid. */
export const SYNC_REQUEST_TTL_MS = 5 * 60 * 1000

/** Most documents one request can name (both versions of every project fit comfortably). */
export const MAX_SYNC_IDS = 50

export interface SyncCandidate {
  _id: string
  githubSyncRequestedAt?: string | null
}

/** Whether a document carries a sync request that is still valid at `now`. */
export function hasFreshSyncRequest(doc: SyncCandidate, now = Date.now()): boolean {
  if (!doc.githubSyncRequestedAt) return false
  const requestedAt = Date.parse(doc.githubSyncRequestedAt)
  if (Number.isNaN(requestedAt)) return false
  // A small allowance for clock skew between the editor's browser and the server.
  return requestedAt <= now + 60_000 && now - requestedAt <= SYNC_REQUEST_TTL_MS
}

/** Validates the route's JSON body: `{ ids: string[] }` with 1..MAX_SYNC_IDS document ids. */
export function parseSyncIds(body: unknown): string[] | null {
  const ids = (body as { ids?: unknown } | null)?.ids
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_SYNC_IDS) return null
  if (!ids.every((id) => typeof id === "string" && /^[\w.-]{1,128}$/.test(id))) return null
  return [...new Set(ids as string[])]
}

export interface SyncResponse {
  synced: string[]
  failed: string[]
  skipped: number
}
