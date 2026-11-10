import { EducationIcon } from "../components/icons"
import { defineField, defineType } from "sanity"

import { yearRange } from "./validation"

export const educationType = defineType({
  name: "education",
  title: "Education",
  type: "document",
  icon: EducationIcon,
  fields: [
    defineField({
      name: "year",
      title: "Years",
      type: "string",
      description: "e.g. 2018 - 2022, or 2024 - Present.",
      validation: yearRange,
    }),
    defineField({
      name: "degree",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "school",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "schoolLogo",
      title: "School logo",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "desc",
      title: "Description",
      type: "string",
    }),
  ],
  orderings: [
    { title: "Newest first", name: "yearDesc", by: [{ field: "year", direction: "desc" }] },
  ],
  preview: {
    select: { degree: "degree", school: "school", year: "year", media: "schoolLogo" },
    prepare: ({ degree, school, year, media }) => ({
      title: degree || "Untitled",
      subtitle: [school, year].filter(Boolean).join(" · "),
      media,
    }),
  },
})
