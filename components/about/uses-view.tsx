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

/**
 * Homecave's content sections from the Studio (Self-hosted, Network & access, the setup):
 * one panel per section, one row per item. `badge` adds a measured status to a row by name.
 */
export function UsesSections({
  sections,
  badge,
}: {
  sections: VisibleSection[]
  badge?: (name: string) => ReactNode
}) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <Panel key={section._key}>
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
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                </div>
                {badge && item.name && badge(item.name)}
              </li>
            ))}
          </ul>
        </Panel>
      ))}
    </div>
  )
}
