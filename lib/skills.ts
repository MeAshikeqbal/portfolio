import type { Skill } from "@/lib/api"

export type SkillCategory = NonNullable<Skill["category"]>

/**
 * Display groups over the Studio's finer skill categories (sanity/schemaTypes/skillType.tsx):
 * the home page's stack panel and the generated résumé group skills the same way. `title` is a
 * key in the `inventory.groups` messages; `label` is the English wording, for the résumé.
 */
export const SKILL_GROUPS: {
  title: "frontend" | "backend" | "infrastructure" | "tools"
  label: string
  categories: SkillCategory[]
}[] = [
  { title: "frontend", label: "Languages & frontend", categories: ["languages", "frontend"] },
  {
    title: "backend",
    label: "Backend & data",
    categories: ["backend", "api-development", "database", "testing"],
  },
  {
    title: "infrastructure",
    label: "Infrastructure & homelab",
    categories: [
      "linux-infrastructure",
      "self-hosting",
      "devops",
      "cicd",
      "networking",
      "operating-systems",
      "monitoring",
      "cloud",
      "security",
    ],
  },
  { title: "tools", label: "Tools & AI", categories: ["ai-automation", "tools"] },
]
