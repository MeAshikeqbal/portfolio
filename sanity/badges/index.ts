import type { DocumentBadgeComponent, SanityDocument } from "sanity"

import { messageBadge, nowBadge, postBadge, projectBadge } from "./logic"

/**
 * Document badges in the editor header, in the site's status vocabulary. They read the draft
 * when there is one, so the badge reflects what publishing would show.
 */
type Doc = SanityDocument & Record<string, unknown>
const current = (props: { draft?: SanityDocument | null; published?: SanityDocument | null }) =>
  (props.draft ?? props.published ?? null) as Doc | null

export const ProjectStatusBadge: DocumentBadgeComponent = (props) =>
  projectBadge(current(props) as Parameters<typeof projectBadge>[0], new Date())

export const PostStateBadge: DocumentBadgeComponent = (props) =>
  postBadge(current(props) as Parameters<typeof postBadge>[0])

export const NowStaleBadge: DocumentBadgeComponent = (props) =>
  // The published update is what the site judges.
  nowBadge((props.published ?? null) as Parameters<typeof nowBadge>[0], new Date())

export const MessageStateBadge: DocumentBadgeComponent = (props) =>
  messageBadge(current(props) as Parameters<typeof messageBadge>[0])
