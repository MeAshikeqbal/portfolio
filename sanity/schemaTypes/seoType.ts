import { defineField, defineType } from "sanity"

import { withCharCount } from "../components/char-count-input"
import { COPY_LIMITS } from "./validation"

/** Per-document SEO overrides. Anything left empty falls back to the document's own fields. */
export const seoType = defineType({
  name: "seo",
  title: "SEO",
  type: "object",
  options: { collapsible: true, collapsed: true },
  fields: [
    defineField({
      name: "title",
      type: "string",
      description: "Overrides the page title in search results and social cards.",
      components: { input: withCharCount(COPY_LIMITS.seoTitle) },
      validation: (rule) =>
        rule.max(COPY_LIMITS.seoTitle).warning("Titles over 70 characters get truncated."),
    }),
    defineField({
      name: "description",
      type: "text",
      rows: 3,
      components: { input: withCharCount(COPY_LIMITS.seoDescription) },
      validation: (rule) =>
        rule
          .max(COPY_LIMITS.seoDescription)
          .warning("Descriptions over 160 characters get truncated."),
    }),
    defineField({
      name: "ogImage",
      title: "Social image",
      type: "image",
      description: "1200×630. Overrides the generated Open Graph image.",
    }),
    defineField({
      name: "noIndex",
      title: "Hide from search engines",
      type: "boolean",
      initialValue: false,
    }),
  ],
})
