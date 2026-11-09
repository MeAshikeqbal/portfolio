import { Container, Section } from "@/components/dashboard/layout"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { SectionHeader } from "@/components/dashboard/section-header"
import { SkillIcon } from "@/components/skill-icon"
import { getSkills, type Skill } from "@/lib/api"
import { isMonochromeIcon } from "@/lib/icons"
import { cn } from "@/lib/utils"

type Category = NonNullable<Skill["category"]>

/** Display groups over the Studio's finer categories (sanity/schemaTypes/skillType.tsx). */
const GROUPS: { title: string; categories: Category[] }[] = [
  { title: "Languages & frontend", categories: ["languages", "frontend"] },
  { title: "Backend & data", categories: ["backend", "api-development", "database", "testing"] },
  {
    title: "Infrastructure & homelab",
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
  { title: "Tools & AI", categories: ["ai-automation", "tools"] },
]

/** Skills shown per group before "show all". */
const VISIBLE = 8
const TOGGLE_ID = "inventory-show-all"

export async function InventorySection() {
  const skills = (await getSkills()).filter((skill) => skill.name)
  if (skills.length === 0) return null

  const grouped = new Set<Category>(GROUPS.flatMap((group) => group.categories))
  const groups = [
    ...GROUPS.map((group) => ({
      title: group.title,
      skills: skills.filter((s) => s.category && group.categories.includes(s.category)),
      collapsed: false,
    })),
    // Uncategorized skills only show once expanded: they're the long tail.
    {
      title: "Other",
      skills: skills.filter((s) => !s.category || !grouped.has(s.category)),
      collapsed: true,
    },
  ].filter((group) => group.skills.length > 0)

  const hidden = groups.reduce(
    (sum, g) => sum + (g.collapsed ? g.skills.length : Math.max(0, g.skills.length - VISIBLE)),
    0,
  )

  return (
    <Section id="inventory" className="border-t">
      <Container>
        <SectionHeader
          title="Stack"
          description="Languages, tools and infrastructure I work with."
        />
        {/* A checkbox drives "show all" through :has(), so it works without JavaScript. */}
        <Panel className="group/inventory">
          <PanelHeader title="inventory" meta={<span>{skills.length} items</span>} />
          <div className="divide-y">
            {groups.map((group) => (
              <section
                key={group.title}
                aria-label={group.title}
                className={cn(
                  "grid gap-x-6 gap-y-2.5 px-4 py-4 sm:grid-cols-[12rem_minmax(0,1fr)]",
                  group.collapsed &&
                    "hidden group-has-[#inventory-show-all:checked]/inventory:grid",
                )}
              >
                <h3 className="pt-1 text-sm font-medium">
                  {group.title}
                  <span className="ml-2 font-normal text-muted-foreground tabular">
                    {group.skills.length}
                  </span>
                </h3>
                <ul className="flex flex-wrap gap-1.5">
                  {group.skills.map((skill, i) => (
                    <SkillChip
                      key={skill._id}
                      skill={skill}
                      overflow={!group.collapsed && i >= VISIBLE}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
          {hidden > 0 && (
            <div className="border-t px-2 py-1">
              <input id={TOGGLE_ID} type="checkbox" className="peer sr-only" />
              <label
                htmlFor={TOGGLE_ID}
                className="flex min-h-11 cursor-pointer items-center justify-center rounded-md text-sm font-medium text-muted-foreground transition-colors peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-ring hover:text-foreground"
              >
                <span className="group-has-[#inventory-show-all:checked]/inventory:hidden">
                  Show all {skills.length}
                </span>
                <span className="hidden group-has-[#inventory-show-all:checked]/inventory:inline">
                  Show fewer
                </span>
              </label>
            </div>
          )}
        </Panel>
      </Container>
    </Section>
  )
}

function SkillChip({ skill, overflow }: { skill: Skill; overflow: boolean }) {
  return (
    <li
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border bg-surface py-1 pr-2.5 pl-1 text-sm",
        !skill.icon && "pl-2.5",
        overflow && "hidden group-has-[#inventory-show-all:checked]/inventory:inline-flex",
      )}
    >
      {skill.icon && (
        <span
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded",
            isMonochromeIcon(skill.icon) ? "bg-surface-2" : "bg-icon-plate",
          )}
        >
          {/* Decorative: the skill's name is printed next to it. */}
          <SkillIcon name={skill.icon} label="" className="size-4 text-foreground" />
        </span>
      )}
      {skill.name}
    </li>
  )
}
