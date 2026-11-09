import { EnvelopeIcon } from "@sanity/icons/Envelope"
import { defineField, defineType } from "sanity"

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
  icon: EnvelopeIcon,
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
    prepare: ({ name, email, status, receivedAt, message }) => ({
      title: `${status === "unread" ? "● " : ""}${name ?? "Unknown"} <${email ?? "?"}>`,
      subtitle: [
        receivedAt
          ? new Date(receivedAt).toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            })
          : null,
        typeof message === "string" ? message.slice(0, 80) : null,
      ]
        .filter(Boolean)
        .join(" · "),
    }),
  },
})

export const inboxSchema = { types: [messageType] }
