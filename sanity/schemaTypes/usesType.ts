import { DesktopIcon } from "@sanity/icons/Desktop"
import { defineArrayMember, defineField, defineType } from "sanity"

import { IconInput, validateIcon } from "../components/icon-input"

/** Singleton behind /uses: the hardware, software and services you use. */
export const usesType = defineType({
  name: "uses",
  title: "Uses",
  type: "document",
  icon: DesktopIcon,
  fields: [
    defineField({
      name: "intro",
      type: "text",
      rows: 3,
      description: "A sentence or two at the top of the page.",
    }),
    defineField({
      name: "sections",
      type: "array",
      description: "Groups such as Hardware, Homelab, Editor & terminal, Services.",
      validation: (rule) => rule.min(1).error("Add at least one section to publish /uses."),
      of: [
        defineArrayMember({
          name: "usesSection",
          title: "Section",
          type: "object",
          fields: [
            defineField({ name: "title", type: "string", validation: (rule) => rule.required() }),
            defineField({
              name: "items",
              type: "array",
              of: [
                defineArrayMember({
                  name: "usesItem",
                  title: "Item",
                  type: "object",
                  fields: [
                    defineField({
                      name: "name",
                      type: "string",
                      validation: (rule) => rule.required(),
                    }),
                    defineField({ name: "description", type: "text", rows: 2 }),
                    defineField({ name: "url", title: "Link", type: "url" }),
                    defineField({
                      name: "icon",
                      title: "Icon",
                      type: "string",
                      description: "Optional, e.g. logos:visual-studio-code or mdi:server.",
                      components: { input: IconInput },
                      validation: (rule) => [
                        rule.regex(/^[a-z0-9-]+:[a-z0-9-]+$/, { name: "Iconify name" }),
                        rule.custom(validateIcon).warning(),
                      ],
                    }),
                  ],
                  preview: { select: { title: "name", subtitle: "description" } },
                }),
              ],
            }),
          ],
          preview: {
            select: { title: "title", items: "items" },
            prepare: ({ title, items }) => ({ title, subtitle: `${items?.length ?? 0} items` }),
          },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: "Uses" }) },
})
