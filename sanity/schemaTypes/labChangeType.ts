import { LabChangeIcon } from "../components/icons"
import { defineField, defineType } from "sanity"

export const LAB_CHANGE_CATEGORIES = [
  { title: "Hardware", value: "hardware" },
  { title: "Storage", value: "storage" },
  { title: "Network", value: "network" },
  { title: "Services", value: "services" },
  { title: "Security", value: "security" },
  { title: "Backups", value: "backups" },
] as const

/**
 * One entry in the Homecave changelog: something changed in the lab on purpose (a disk added, a
 * service moved, a network change). Shown newest first beside the incident log.
 */
export const labChangeType = defineType({
  name: "labChange",
  title: "Lab change",
  type: "document",
  icon: LabChangeIcon,
  fields: [
    defineField({
      name: "date",
      type: "date",
      initialValue: () => new Date().toISOString().slice(0, 10),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "title",
      type: "string",
      description: "What changed, in a few words: “Added a second NVMe to Tower”.",
      validation: (rule) => rule.required().max(90),
    }),
    defineField({
      name: "note",
      type: "text",
      rows: 2,
      description:
        "Optional: why, or what it fixed. Public names only: no hostnames, IPs, domains or versions.",
      validation: (rule) => rule.max(240),
    }),
    defineField({
      name: "category",
      type: "string",
      options: { list: [...LAB_CHANGE_CATEGORIES], layout: "radio", direction: "horizontal" },
      validation: (rule) => rule.required(),
    }),
  ],
  orderings: [
    { title: "Newest first", name: "dateDesc", by: [{ field: "date", direction: "desc" }] },
  ],
  initialValue: { category: "services" },
  preview: {
    select: { title: "title", date: "date", category: "category" },
    prepare: ({ title, date, category }) => ({
      title: title || "Untitled",
      subtitle: [date, category].filter(Boolean).join(" · "),
    }),
  },
})
