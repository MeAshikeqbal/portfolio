import { BarChartIcon } from "@sanity/icons/BarChart"
import { orderRankField, orderRankOrdering } from "@sanity/orderable-document-list"
import { defineField, defineType } from "sanity"

import { iconUrl } from "../../lib/icons"
import { IconInput, validateIcon } from "../components/icon-input"

/** Categories already used by the skills in the dataset. */
export const SKILL_CATEGORIES = [
  { title: "Languages", value: "languages" },
  { title: "Frontend", value: "frontend" },
  { title: "Backend", value: "backend" },
  { title: "API development", value: "api-development" },
  { title: "Database", value: "database" },
  { title: "Cloud", value: "cloud" },
  { title: "DevOps", value: "devops" },
  { title: "CI/CD", value: "cicd" },
  { title: "Linux & infrastructure", value: "linux-infrastructure" },
  { title: "Networking", value: "networking" },
  { title: "Operating systems", value: "operating-systems" },
  { title: "Self-hosting", value: "self-hosting" },
  { title: "Monitoring", value: "monitoring" },
  { title: "Security", value: "security" },
  { title: "Testing", value: "testing" },
  { title: "AI & automation", value: "ai-automation" },
  { title: "Tools", value: "tools" },
]

/** List-preview media: the icon on a light tile (monochrome icons are black as <img>). */
function IconMedia({ url }: { url: string }) {
  return (
    <span
      style={{
        display: "grid",
        placeItems: "center",
        width: "100%",
        height: "100%",
        background: "#f4f4f5",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Studio preview of a same-origin SVG */}
      <img src={url} alt="" style={{ width: "65%", height: "65%", objectFit: "contain" }} />
    </span>
  )
}

const categoryTitle = (value?: string) =>
  SKILL_CATEGORIES.find((category) => category.value === value)?.title

export const skillType = defineType({
  name: "skills",
  title: "Skills",
  type: "document",
  icon: BarChartIcon,
  orderings: [orderRankOrdering],
  fields: [
    orderRankField({ type: "skills" }),
    defineField({
      name: "name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "icon",
      title: "Icon",
      type: "string",
      description:
        "An Iconify name such as logos:aws or mdi:security. Search below, or browse https://icon-sets.iconify.design",
      components: { input: IconInput },
      validation: (rule) => [
        rule.regex(/^[a-z0-9-]+:[a-z0-9-]+$/, { name: "Iconify name" }),
        rule.custom(validateIcon).warning(),
      ],
    }),
    defineField({
      name: "category",
      type: "string",
      options: { list: SKILL_CATEGORIES },
    }),
  ],
  preview: {
    select: { title: "name", icon: "icon", category: "category" },
    prepare: ({ title, icon, category }) => {
      const url = icon ? iconUrl(icon) : null
      return {
        title,
        subtitle: [categoryTitle(category), icon].filter(Boolean).join(" · "),
        media: url ? <IconMedia url={url} /> : undefined,
      }
    },
  },
})
