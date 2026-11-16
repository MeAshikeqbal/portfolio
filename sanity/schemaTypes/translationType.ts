import { defineArrayMember, defineField, defineType } from "sanity"
import { allLocales, localeInfo } from "../../i18n/locales"
import { TRANSLATABLE_TYPES } from "../../lib/translate/types"
import { TranslationIcon } from "../components/icons"
import { workExperience } from "./experiencesType"
import { nowEntry } from "./nowType"
import { usesSection } from "./usesType"

/**
 * A machine translation of one published document into one language, written by
 * lib/translate/document.ts when the document is published (and by the backfill script).
 * `_id` is `translation-<language>-<source id>`, so the site finds it without a query.
 *
 * `content` holds the translated copy of the source's translatable fields in the source's own
 * shape (arrays keep their keys, images and other fields), and queries prefer it field by field.
 * Tick "Edited by hand" to keep a hand-corrected copy: auto-translation then leaves it alone.
 */
export const translationType = defineType({
  name: "translation",
  title: "Translation",
  type: "document",
  icon: TranslationIcon,
  fields: [
    defineField({
      name: "source",
      type: "reference",
      weak: true,
      to: TRANSLATABLE_TYPES.map((type) => ({ type })),
      readOnly: true,
    }),
    defineField({
      name: "language",
      type: "string",
      options: {
        list: allLocales
          .filter((locale) => locale !== "en")
          .map((locale) => ({ title: localeInfo[locale].englishName, value: locale })),
      },
      readOnly: true,
    }),
    defineField({
      name: "manual",
      title: "Edited by hand",
      type: "boolean",
      description: "Auto-translation won't overwrite this copy while this is on.",
      initialValue: false,
    }),
    defineField({ name: "translatedAt", type: "datetime", readOnly: true }),
    defineField({
      name: "sourceRev",
      title: "Source revision",
      type: "string",
      readOnly: true,
      hidden: true,
    }),
    defineField({
      name: "content",
      type: "object",
      fields: [
        defineField({ name: "title", type: "string" }),
        defineField({ name: "excerpt", type: "text", rows: 3 }),
        defineField({ name: "description", type: "text", rows: 3 }),
        defineField({ name: "location", type: "string" }),
        defineField({ name: "intro", type: "text", rows: 3 }),
        defineField({ name: "degree", type: "string" }),
        defineField({ name: "desc", type: "string" }),
        defineField({ name: "body", type: "blockContent" }),
        defineField({
          name: "mainImage",
          type: "image",
          fields: [defineField({ name: "alt", type: "string" })],
        }),
        defineField({ name: "seo", type: "seo" }),
        defineField({ name: "video", type: "video" }),
        defineField({ name: "archive", type: "array", of: [nowEntry] }),
        defineField({ name: "sections", type: "array", of: [usesSection] }),
        defineField({ name: "works", type: "array", of: [workExperience] }),
      ],
    }),
    defineField({
      name: "memory",
      title: "Translation memory",
      description: "Translated segments by source hash, so unchanged text isn't sent again.",
      type: "array",
      readOnly: true,
      hidden: true,
      of: [
        defineArrayMember({
          name: "segment",
          type: "object",
          fields: [
            defineField({ name: "hash", type: "string" }),
            defineField({ name: "html", type: "text" }),
          ],
        }),
      ],
    }),
  ],
  preview: {
    select: {
      language: "language",
      title: "content.title",
      sourceTitle: "source.title",
      manual: "manual",
    },
    prepare: ({ language, title, sourceTitle, manual }) => ({
      title: title || sourceTitle || "Translation",
      subtitle: [language?.toUpperCase(), manual && "edited by hand"].filter(Boolean).join(" · "),
    }),
  },
})
