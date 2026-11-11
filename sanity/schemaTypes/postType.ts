import { PostIcon } from "../components/icons"
import { defineArrayMember, defineField, defineType } from "sanity"

import { withCharCount } from "../components/char-count-input"
import { COPY_LIMITS, requiredAlt } from "./validation"

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" })

export const postType = defineType({
  name: "post",
  title: "Post",
  type: "document",
  icon: PostIcon,
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "meta", title: "Meta" },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({
      name: "title",
      type: "string",
      group: "content",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      type: "slug",
      group: "content",
      options: { source: "title" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "mainImage",
      title: "Cover image",
      type: "image",
      group: "content",
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
      name: "body",
      type: "blockContent",
      group: "content",
    }),
    defineField({
      name: "excerpt",
      type: "text",
      rows: 3,
      group: "meta",
      description:
        "Short summary for the writing log, feeds and search results. Defaults to the start of the post.",
      components: { input: withCharCount(COPY_LIMITS.postExcerpt) },
      validation: (rule) => [
        rule.max(200),
        rule
          .max(COPY_LIMITS.postExcerpt)
          .warning("The writing log trims excerpts to about 160 characters, at a word."),
      ],
    }),
    defineField({
      name: "publishedAt",
      type: "datetime",
      group: "meta",
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "author",
      type: "reference",
      group: "meta",
      to: { type: "author" },
    }),
    defineField({
      name: "categories",
      type: "array",
      group: "meta",
      of: [defineArrayMember({ type: "reference", to: { type: "category" } })],
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: "featured",
      type: "boolean",
      group: "meta",
      description: "Show on the home page. Featured posts come first; the rest fill in by date.",
      initialValue: false,
    }),
    defineField({
      name: "archived",
      type: "boolean",
      group: "meta",
      description:
        "Keep the page (marked noindex, with an 'archived' note) but take it out of the writing index, home page, RSS, sitemap, search palette and related posts.",
      initialValue: false,
    }),
    defineField({
      name: "seo",
      type: "seo",
      group: "seo",
    }),
  ],
  // New posts are credited to the author whose name matches the logged-in user.
  initialValue: async (_params, { getClient, currentUser }) => {
    if (!currentUser?.name) return {}
    const authorId = await getClient({ apiVersion: "2026-11-01" }).fetch<string | null>(
      `*[_type == "author" && lower(name) == lower($name) && !(_id in path("drafts.**"))][0]._id`,
      { name: currentUser.name },
    )
    return authorId ? { author: { _type: "reference", _ref: authorId } } : {}
  },
  orderings: [
    {
      title: "Newest first",
      name: "publishedDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
  ],
  preview: {
    select: {
      title: "title",
      publishedAt: "publishedAt",
      category0: "categories.0.title",
      category1: "categories.1.title",
      media: "mainImage",
      archived: "archived",
      featured: "featured",
    },
    prepare: ({ title, publishedAt, category0, category1, media, archived, featured }) => ({
      title,
      subtitle: [
        archived ? "archived" : featured ? "pinned" : null,
        publishedAt ? dateFormat.format(new Date(publishedAt)) : "No date",
        [category0, category1].filter(Boolean).join(", "),
      ]
        .filter(Boolean)
        .join(" · "),
      media,
    }),
  },
})
