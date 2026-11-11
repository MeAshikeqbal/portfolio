import { CategoryIcon } from "../components/icons"
import { defineField, defineType } from "sanity"

export const categoryType = defineType({
  name: "category",
  title: "Category",
  type: "document",
  icon: CategoryIcon,
  fields: [
    defineField({
      name: "title",
      type: "string",
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
  ],
})
