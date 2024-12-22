import { UserIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const aboutType = defineType({
  name: "abouts",
  title: "Abouts",
  type: "document",
  icon: UserIcon,
  fields: [
    defineField({
      name: "title",
      type: "string",
    }),
    defineField({
      name: "description",
      type: "text",
    }),
    defineField({
      name: "imgUrl",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
  ],
});
