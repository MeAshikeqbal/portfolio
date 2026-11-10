import Link from "next/link"
import { LabNodeDot, LabNodeTrouble, LabSummary } from "@/components/lab/lab-badges"

export interface HomelabItem {
  _key: string
  name: string | null
  description: string | null
}

/**
 * The hero card's homelab rows: the Homecave "Homelab" items that are machines in the lab
 * (Tower, Mini PC #1, …), each with a status dot, and the word when it isn't up. Spec rows
 * (the cluster, storage) stay on Homecave, so every row lines up and roles don't truncate.
 * The header shows the summary ("3/3 up"), which is all phones see.
 */
export function HomelabList({
  items,
  machines,
}: {
  items: HomelabItem[] | null | undefined
  /** The lab's machine names. When known, only those rows show (specs live on Homecave). */
  machines?: string[]
}) {
  const named = (items ?? []).filter((item) => item.name?.trim())
  if (named.length === 0) return null
  const known = new Set(machines ?? [])
  const onlyMachines = named.filter((item) => known.has(item.name!.trim()))
  // Fall back to every row when the lab can't be read (or names don't match).
  const homelab = onlyMachines.length > 0 ? onlyMachines : named

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
          and Writing starts where the visitor can see it. On wider screens: one grid, so every
          name and every description starts on the same line (dot · name · role · trouble). */}
      <ul
        aria-label="Homelab"
        className="hidden grid-cols-[0.5rem_max-content_minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1.5 px-4 pt-2 pb-3.5 text-sm sm:grid"
      >
        {homelab.map((item) => (
          <li key={item._key} className="col-span-4 grid grid-cols-subgrid items-baseline">
            <span className="self-center">
              <LabNodeDot name={item.name!} />
            </span>
            <span className="font-medium">{item.name}</span>
            <span className="truncate text-muted-foreground">{item.description}</span>
            <LabNodeTrouble name={item.name!} />
          </li>
        ))}
      </ul>
    </div>
  )
}
