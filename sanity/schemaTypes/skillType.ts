import { defineType } from "sanity";
import { BarChartIcon } from "@sanity/icons";

export const skillType = defineType({
  name: "skills",
  title: "Skills",
  type: "document",
  icon: BarChartIcon,
  fields: [
    {
      name: "name",
      type: "string",
    },
    {
      name: "icon",
      type: "image",
      options: {
        hotspot: true,
      },
    },
  ],
});
