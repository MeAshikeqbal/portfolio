import { ProjectIcon } from "../components/icons"
import { orderRankField, orderRankOrdering } from "@sanity/orderable-document-list"
import { defineArrayMember, defineField, defineType } from "sanity"

import { requiredAlt } from "./validation"

const STATUS_TITLES: Record<string, string> = {
  active: "Active",
  maintained: "Maintained",
  archived: "Archived",
}

export const projectType = defineType({
  name: "project",
  title: "Project",
  type: "document",
  icon: ProjectIcon,
  groups: [
    { name: "overview", title: "Overview", default: true },
    { name: "caseStudy", title: "Case study" },
    { name: "github", title: "GitHub" },
    { name: "seo", title: "SEO" },
  ],
  orderings: [orderRankOrdering],
  fields: [
    // Set by drag-and-drop in the Projects list.
    orderRankField({ type: "project", newItemPosition: "before" }),
    defineField({
      name: "title",
      type: "string",
      group: "overview",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      type: "slug",
      group: "overview",
      options: { source: "title" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "description",
      type: "text",
      rows: 3,
      group: "overview",
      description: "One or two sentences for cards and search results.",
      validation: (rule) => [
        rule.required(),
        rule.max(300).warning("Cards show about 300 characters; the rest is cut off."),
      ],
    }),
    defineField({
      name: "status",
      type: "string",
      group: "overview",
      options: {
        list: Object.entries(STATUS_TITLES).map(([value, title]) => ({ title, value })),
        layout: "radio",
        direction: "horizontal",
      },
      initialValue: "active",
      validation: (rule) => rule.required().warning("Pick a status so the card shows one."),
    }),
    defineField({
      name: "featured",
      type: "boolean",
      group: "overview",
      description: "Show in Selected Work on the home page.",
      initialValue: false,
    }),
    defineField({
      name: "tech",
      title: "Tech stack",
      type: "array",
      group: "overview",
      of: [defineArrayMember({ type: "string" })],
      options: { layout: "tags" },
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: "mainImage",
      title: "Cover image",
      type: "image",
      group: "overview",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          type: "string",
          title: "Alternative text",
          validation: requiredAlt,
        }),
      ],
    }),
    defineField({
      name: "url",
      title: "Live URL",
      type: "url",
      group: "overview",
    }),
    defineField({
      name: "github",
      title: "GitHub repository",
      type: "url",
      group: ["overview", "github"],
      description: "e.g. https://github.com/owner/repo. Stars, commits and language sync from it.",
      validation: (rule) =>
        rule.custom((value) =>
          !value || /^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(value)
            ? true
            : "Use the repository URL, e.g. https://github.com/owner/repo",
        ),
    }),
    defineField({
      name: "publishedAt",
      type: "datetime",
      group: "overview",
    }),
    defineField({
      name: "body",
      title: "Case study",
      type: "blockContent",
      group: "caseStudy",
      description: "Long-form write-up shown on the project's own page.",
    }),
    defineField({
      name: "githubData",
      title: "GitHub data",
      type: "object",
      group: "github",
      description: "Synced daily from GitHub, or now with “Sync from GitHub” in the ⋯ menu.",
      readOnly: true,
      fields: [
        { name: "syncedAt", title: "Last synced", type: "datetime" },
        { name: "stars", type: "number" },
        { name: "commits", type: "number" },
        { name: "license", type: "string" },
        { name: "language", type: "string" },
        { name: "topics", type: "array", of: [{ type: "string" }] },
        { name: "pushedAt", type: "datetime" },
        {
          name: "weeklyCommits",
          title: "Weekly commits (last 12 weeks)",
          type: "array",
          of: [{ type: "number" }],
        },
      ],
    }),
    defineField({
      name: "seo",
      type: "seo",
      group: "seo",
    }),
    defineField({
      // Stamped by the "Sync from GitHub" action; cleared once the sync has run.
      name: "githubSyncRequestedAt",
      type: "datetime",
      hidden: true,
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      title: "title",
      status: "status",
      featured: "featured",
      language: "githubData.language",
      media: "mainImage",
    },
    prepare: ({ title, status, featured, language, media }) => ({
      title,
      subtitle: [featured ? "★ Featured" : null, STATUS_TITLES[status] ?? status, language]
        .filter(Boolean)
        .join(" · "),
      media,
    }),
  },
})
