/** Private dataset for contact-form messages (Studio side; the server uses SANITY_INBOX_DATASET). */
export const inboxDatasetName = process.env.NEXT_PUBLIC_SANITY_INBOX_DATASET || "inbox"

/** Studio URL that opens a message in the Inbox workspace. */
export function inboxMessageHref(id: string): string {
  return `/studio/inbox/intent/edit/id=${encodeURIComponent(id)};type=message`
}
