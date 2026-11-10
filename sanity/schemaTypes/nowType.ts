import { ClockIcon } from "@sanity/icons/Clock"
import { defineArrayMember, defineField, defineType } from "sanity"

/** Today as YYYY-MM-DD in the editor's time zone (Sanity `date` fields have no time). */
export function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * Singleton behind /now, after nownownow.com: what you'd tell a friend you hadn't seen in a
 * year. The current update is the page; "Start a new update" (sanity/actions) moves the
 * published one into `archive` before you rewrite it.
 */
export const nowType = defineType({
  name: "now",
  title: "Now",
  type: "document",
  icon: ClockIcon,
  fieldsets: [
    {
      name: "history",
      title: "Previous updates",
      description: "Filled by “Start a new update”. Editable, to fix a typo in an old entry.",
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    defineField({
      name: "updatedOn",
      title: "Updated on",
      type: "date",
      description:
        "Shown as “updated …” and used for the stale warning. Change it when the update is new, not for typo fixes.",
      initialValue: () => todayIso(),
      // A warning, not an error: until it's set, the page falls back to the last edit.
      validation: (rule) => rule.required().warning("Set the date this update was written."),
    }),
    defineField({
      name: "location",
      type: "string",
      description: "Optional, e.g. a city or 'remote'.",
    }),
    defineField({
      name: "body",
      title: "What I'm doing now",
      type: "blockContent",
      description:
        "The big picture, not news: where you are in life, the 2–4 things you're focused on (and why), and what you're deliberately not doing right now. Optional: what you're learning or reading.",
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "archive",
      title: "Previous updates",
      type: "array",
      fieldset: "history",
      of: [
        defineArrayMember({
          name: "nowEntry",
          title: "Update",
          type: "object",
          fields: [
            defineField({ name: "date", type: "date", validation: (rule) => rule.required() }),
            defineField({ name: "location", type: "string" }),
            defineField({
              name: "body",
              type: "blockContent",
              validation: (rule) => rule.required().min(1),
            }),
          ],
          preview: {
            select: { date: "date", location: "location" },
            prepare: ({ date, location }) => ({
              title: date ?? "Undated update",
              subtitle: location,
            }),
          },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: "Now" }) },
})
