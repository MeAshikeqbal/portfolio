import { ExperienceIcon } from "../components/icons"
import { defineArrayMember, defineField, defineType } from "sanity"

import { yearRange } from "./validation"

/** One year (or range) of the experience timeline, holding the roles from that period. */
export const experiencesType = defineType({
  name: "experiences",
  title: "Experiences",
  type: "document",
  icon: ExperienceIcon,
  fields: [
    defineField({
      name: "year",
      title: "Years",
      type: "string",
      description: "e.g. 2026, or 2024 - Present.",
      validation: yearRange,
    }),
    defineField({
      name: "works",
      title: "Roles",
      type: "array",
      validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({
          name: "workExperience",
          title: "Role",
          type: "object",
          fields: [
            defineField({
              name: "name",
              title: "Role",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "company",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              // Stored as "copmanyLogo" (sic); renaming would orphan existing data.
              name: "copmanyLogo",
              title: "Company logo",
              type: "image",
              options: { hotspot: true },
            }),
            defineField({
              name: "desc",
              title: "Description",
              type: "string",
            }),
          ],
          preview: {
            select: { title: "name", subtitle: "company", media: "copmanyLogo" },
          },
        }),
      ],
    }),
  ],
  orderings: [
    { title: "Newest first", name: "yearDesc", by: [{ field: "year", direction: "desc" }] },
  ],
  preview: {
    select: {
      year: "year",
      role: "works.0.name",
      company: "works.0.company",
      works: "works",
      media: "works.0.copmanyLogo",
    },
    prepare: ({ year, role, company, works, media }) => {
      const more = Array.isArray(works) && works.length > 1 ? ` +${works.length - 1}` : ""
      return {
        title: [role, company].filter(Boolean).join(" · ") || "No roles yet",
        subtitle: `${year ?? "No year"}${more}`,
        media,
      }
    },
  },
})
