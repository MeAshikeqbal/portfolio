import Link from "next/link"
import { LabNodeBadge, LabSummary } from "@/components/lab/lab-badges"

export interface HomelabItem {
  _key: string
  name: string | null
  description: string | null
}

/**
 * The hero card's homelab rows: the first items of the /uses "Homelab" section (the query
 * caps them at five). Renders nothing until that section has named items. Rows whose name
 * matches a machine in the lab's heartbeat show its measured state; the header shows the
 * summary ("3/3 up"), which is all phones see.
 */
export function HomelabList({ items }: { items: HomelabItem[] | null | undefined }) {
  const homelab = (items ?? []).filter((item) => item.name?.trim())
  if (homelab.length === 0) return null

  return (
    <div className="border-b">
      <div className="flex items-center justify-between px-4 pt-3 pb-3 label-caps sm:pb-0">
        <span className="flex items-center gap-2">
          homelab
          <LabSummary />
        </span>
        {/* The visible label is small; the padding gives it a 44px touch target. */}
        <Link
          href="/homecave"
          className="-my-3.5 -mr-2 inline-flex min-h-11 items-center px-2 transition-colors hover:text-foreground focus-visible:-outline-offset-2"
        >
          live dashboard
        </Link>
      </div>
      {/* Phones get the header and its link only, so the hero stays inside the first screen
          and Writing starts where the visitor can see it. */}
      <ul aria-label="Homelab" className="hidden px-4 pt-1 pb-3 sm:block">
        {homelab.map((item) => (
          <li key={item._key} className="flex items-baseline gap-3 py-1 text-sm">
            <span className="shrink-0 font-medium">{item.name}</span>
            {item.description && (
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {item.description}
              </span>
            )}
            {item.name && <LabNodeBadge name={item.name} className="ml-auto" />}
          </li>
        ))}
      </ul>
    </div>
  )
}
