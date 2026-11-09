import { ClockIcon } from "@sanity/icons/Clock"
import { defineField, defineType } from "sanity"

/** Singleton behind /now: what you're focused on at the moment (nownownow.com convention). */
export const nowType = defineType({
  name: "now",
  title: "Now",
  type: "document",
  icon: ClockIcon,
  fields: [
    defineField({
      name: "location",
      type: "string",
      description: "Optional, e.g. a city or 'remote'.",
    }),
    defineField({
      name: "body",
      title: "What I'm doing now",
      type: "blockContent",
      validation: (rule) => rule.required().min(1),
    }),
  ],
  preview: { prepare: () => ({ title: "Now" }) },
})
