import { ArrowUpRight } from "lucide-react"
import type { ReactNode } from "react"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { SkillIcon } from "@/components/skill-icon"
import type { USES_QUERY_RESULT } from "@/sanity.types"
import { isMonochromeIcon } from "@/lib/icons"
import { cn } from "@/lib/utils"

type Uses = NonNullable<USES_QUERY_RESULT>
type UsesSection = NonNullable<Uses["sections"]>[number]
type UsesItem = NonNullable<UsesSection["items"]>[number]
export type VisibleSection = UsesSection & { items: UsesItem[] }

/** Sections worth showing: items without a name are dropped, then sections left empty. */
export function visibleUsesSections(uses: USES_QUERY_RESULT | null | undefined): VisibleSection[] {
  return (uses?.sections ?? [])
    .map((section) => ({
      ...section,
      items: (section.items ?? []).filter((item) => item.name?.trim()),
    }))
    .filter((section) => section.items.length > 0)
}

/** The section the hero and Homecave's node panels read (title starts with "Homelab"). */
export function isHomelab(title: string | null | undefined): boolean {
  return /^homelab/i.test(title ?? "")
}

/** The Studio's Homelab rows as node specs: names in order, descriptions as role lines. */
export function homelabSpecs(
  uses: USES_QUERY_RESULT | null | undefined,
): { name: string; description: string | null }[] {
  const homelab = visibleUsesSections(uses).find((s) => isHomelab(s.title))
  return (homelab?.items ?? []).map((item) => ({
    name: item.name!.trim(),
    description: item.description ?? null,
  }))
}

/** Rough rendered heights (px) of a panel header and its rows, for balancing columns. */
const HEADER_PX = 40
const ROW_PX = 54
const DESCRIPTION_PX = 14

const panelHeight = (section: VisibleSection) =>
  HEADER_PX +
  section.items.reduce((sum, item) => sum + ROW_PX + (item.description ? DESCRIPTION_PX : 0), 0)

/**
 * Deal panels into two stacks, each to the shorter one, so a short panel never sits under the
 * gap a tall neighbour leaves in a row-by-row grid. Panels keep their Studio order per stack.
 */
function balance(sections: VisibleSection[]): VisibleSection[][] {
  const columns: VisibleSection[][] = [[], []]
  const heights = [0, 0]
  for (const section of sections) {
    const i = heights[0] <= heights[1] ? 0 : 1
    columns[i].push(section)
    heights[i] += panelHeight(section)
  }
  return columns.filter((column) => column.length > 0)
}

/**
 * Homecave's content sections from the Studio (Self-hosted, Network & access, the setup):
 * one panel per section, one row per item, in two balanced stacks on wide screens (one on
 * phones). `badge` adds a measured status to a row by name.
 */
export function UsesSections({
  sections,
  badge,
  className,
}: {
  sections: VisibleSection[]
  badge?: (name: string) => ReactNode
  /** Extra classes for the wrapper (spacing around it). */
  className?: string
}) {
  return (
    <div className={cn("grid items-start gap-6 lg:grid-cols-2", className)}>
      {balance(sections).map((column, i) => (
        <div key={i} className="space-y-6">
          {column.map((section) => (
            <UsesPanel key={section._key} section={section} badge={badge} />
          ))}
        </div>
      ))}
    </div>
  )
}

function UsesPanel({
  section,
  badge,
}: {
  section: VisibleSection
  badge?: (name: string) => ReactNode
}) {
  return (
    <Panel>
      <PanelHeader title={section.title} meta={<span>{section.items.length} items</span>} />
      <ul className="divide-y">
        {section.items.map((item) => (
          <li key={item._key} className="flex items-start gap-3 px-4 py-3">
            {item.icon && (
              <span
                className={cn(
                  "mt-0.5 grid size-7 shrink-0 place-items-center rounded",
                  isMonochromeIcon(item.icon) ? "bg-surface-2" : "bg-icon-plate",
                )}
              >
                <SkillIcon name={item.icon} label="" className="size-4.5 text-foreground" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium hover:underline"
                >
                  {item.name}
                  <ArrowUpRight className="size-3.5 text-muted-foreground" aria-hidden />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <p className="font-medium">{item.name}</p>
              )}
              {item.description && (
                <p className="text-sm text-pretty text-muted-foreground">{item.description}</p>
              )}
            </div>
            {badge && item.name && badge(item.name)}
          </li>
        ))}
      </ul>
    </Panel>
  )
}
