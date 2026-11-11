import { defineField, defineType } from "sanity"

import { MessageIcon } from "../components/icons"
import { statusMedia } from "../components/status"
import { snippet, timeAgo } from "../dashboard/logic"

export const MESSAGE_STATUSES = [
  { title: "Unread", value: "unread" },
  { title: "Read", value: "read" },
  { title: "Archived", value: "archived" },
] as const

/**
 * A contact-form message. Lives in the PRIVATE `inbox` dataset (never the public
 * `production` one), so names and email addresses can't be read through the public API.
 */
export const messageType = defineType({
  name: "message",
  title: "Message",
  type: "document",
  icon: MessageIcon,
  // Status changes apply immediately: no draft to publish just to mark a message read.
  liveEdit: true,
  fields: [
    defineField({
      name: "status",
      type: "string",
      options: { list: [...MESSAGE_STATUSES], layout: "radio", direction: "horizontal" },
      initialValue: "unread",
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "name", type: "string", readOnly: true }),
    defineField({ name: "email", type: "string", readOnly: true }),
    defineField({ name: "message", type: "text", rows: 10, readOnly: true }),
    defineField({ name: "receivedAt", title: "Received", type: "datetime", readOnly: true }),
  ],
  orderings: [
    {
      title: "Newest first",
      name: "receivedDesc",
      by: [{ field: "receivedAt", direction: "desc" }],
    },
  ],
  preview: {
    select: {
      name: "name",
      email: "email",
      status: "status",
      receivedAt: "receivedAt",
      message: "message",
    },
    // A data row: unread messages lead with an info dot; the state is also the first word.
    prepare: ({ name, email, status, receivedAt, message }) => ({
      title: `${name ?? "Unknown"} <${email ?? "?"}>`,
      subtitle: [status, receivedAt ? timeAgo(receivedAt) : null, snippet(message, 80) || null]
        .filter(Boolean)
        .join(" · "),
      media: statusMedia(status === "unread" ? "info" : "idle", status ?? "no status"),
    }),
  },
})

export const inboxSchema = { types: [messageType] }
