import { DocumentTextIcon } from "@sanity/icons/DocumentText"
import { defineArrayMember, defineField, defineType } from "sanity";

export const projectType = defineType({
  name: "project",
  title: "Project",
  type: "document",
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: "title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      type: "slug",
      options: {
        source: "title",
      },
    }),
    defineField({
      name: "description",
      type: "text",
    }),
    defineField({
      name: "status",
      type: "string",
      options: {
        list: [
          { title: "Active", value: "active" },
          { title: "Maintained", value: "maintained" },
          { title: "Archived", value: "archived" },
        ],
        layout: "radio",
        direction: "horizontal",
      },
      initialValue: "active",
    }),
    defineField({
      name: "featured",
      type: "boolean",
      description: "Show in Selected Work on the home page.",
      initialValue: false,
    }),
    defineField({
      name: "order",
      type: "number",
      description: "Lower numbers are listed first.",
    }),
    defineField({
      name: "tech",
      title: "Tech stack",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      options: { layout: "tags" },
    }),
    defineField({
      name: "body",
      title: "Case study",
      type: "blockContent",
      description: "Long-form write-up shown on the project's own page.",
    }),
    defineField({
      name: "mainImage",
      type: "image",
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: "alt",
          type: "string",
          title: "Alternative text",
        },
      ],
    }),
    defineField({
      name: "publishedAt",
      type: "datetime",
    }),
    defineField({
      name: "github",
      type: "url",
      placeholder:"Github URL"
    }),
    defineField({
      name: "url",
      type: "url",
      placeholder:"Project live URL"
    }),
    defineField({
      name: "githubData",
      title: "GitHub data",
      type: "object",
      description: "Synced daily from GitHub by /api/sync-github-data.",
      readOnly: true,
      fields: [
        { name: "stars", type: "number" },
        { name: "commits", type: "number" },
        { name: "license", type: "string" },
        { name: "language", type: "string" },
        { name: "topics", type: "array", of: [{ type: "string" }] },
        { name: "pushedAt", type: "datetime" },
      ],
    }),
    defineField({
      name: "seo",
      type: "seo",
    }),
  ],
  orderings: [
    { title: "Manual order", name: "manual", by: [{ field: "order", direction: "asc" }] },
  ],
});
