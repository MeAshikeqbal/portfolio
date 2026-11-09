import { defineType } from "sanity"
import { BarChartIcon } from "@sanity/icons/BarChart"

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
      title: "Icon (Iconify name)",
      type: "string",
      description:
        "An Iconify icon name such as `logos:aws` or `mdi:security`. Browse icons at https://icon-sets.iconify.design",
      validation: (rule) =>
        rule.regex(/^[a-z0-9-]+:[a-z0-9-]+$/, { name: "Iconify name", invert: false }),
    },
  ],
})
