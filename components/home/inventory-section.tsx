import { Container, Section } from "@/components/dashboard/layout"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { SectionHeader } from "@/components/dashboard/section-header"
import { SkillIcon } from "@/components/skill-icon"
import { getSkills, type Skill } from "@/lib/api"
import { isMonochromeIcon } from "@/lib/icons"
import { cn } from "@/lib/utils"

/** How many skills show before the "show all" toggle. */
const INITIAL = 24

export async function InventorySection() {
  const skills = (await getSkills()).filter((skill) => skill.name)
  if (skills.length === 0) return null

  const first = skills.slice(0, INITIAL)
  const rest = skills.slice(INITIAL)

  return (
    <Section id="inventory" className="border-t">
      <Container>
        <SectionHeader
          eyebrow="inventory"
          title="Stack"
          description="Languages, tools and infrastructure I work with."
        />
        <Panel>
          <PanelHeader title="installed" meta={<span>{skills.length} items</span>} />
          <div className="p-4">
            <SkillGrid skills={first} />
            {rest.length > 0 && (
              // Native disclosure: works without JavaScript and keeps the page short by default.
              <details className="group mt-2">
                <summary className="cursor-pointer list-none py-2 text-center label-caps transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">show all {skills.length} ↓</span>
                  <span className="hidden group-open:inline">show fewer ↑</span>
                </summary>
                <SkillGrid skills={rest} />
              </details>
            )}
          </div>
        </Panel>
      </Container>
    </Section>
  )
}

function SkillGrid({ skills }: { skills: Skill[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {skills.map((skill) => (
        <li
          key={skill._id}
          className="flex min-w-0 items-center gap-2.5 rounded-md border px-2.5 py-2 text-sm"
        >
          {skill.icon && (
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded",
                isMonochromeIcon(skill.icon) ? "bg-surface-2" : "bg-icon-plate",
              )}
            >
              {/* Decorative: the skill's name is printed next to it. */}
              <SkillIcon name={skill.icon} label="" className="size-4.5 text-foreground" />
            </span>
          )}
          <span className="truncate">{skill.name}</span>
        </li>
      ))}
    </ul>
  )
}
