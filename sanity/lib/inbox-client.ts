import "server-only"

import { writeClient } from "./write-client"

/** Name of the PRIVATE dataset that holds contact-form messages. */
export const inboxDataset = process.env.SANITY_INBOX_DATASET || "inbox"

/** Server-only client for the inbox dataset (messages must never go to the public dataset). */
export const inboxClient = writeClient.withConfig({ dataset: inboxDataset })
