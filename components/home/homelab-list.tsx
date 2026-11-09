import Link from "next/link"

export interface HomelabItem {
  _key: string
  name: string | null
  description: string | null
}

/**
 * The hero card's homelab rows: the first items of the /uses "Homelab" section (the query
 * caps them at five). Renders nothing until that section has named items.
 */
export function HomelabList({ items }: { items: HomelabItem[] | null | undefined }) {
  const homelab = (items ?? []).filter((item) => item.name?.trim())
  if (homelab.length === 0) return null

  return (
    <div className="border-b">
      <div className="flex items-center justify-between px-4 pt-3 label-caps">
        <span>homelab</span>
        <Link href="/uses" className="transition-colors hover:text-foreground">
          full setup
        </Link>
      </div>
      <ul aria-label="Homelab" className="px-4 pt-1 pb-3">
        {homelab.map((item) => (
          <li key={item._key} className="flex items-baseline gap-3 py-1 text-sm">
            <span className="shrink-0 font-medium">{item.name}</span>
            {item.description && (
              <span className="truncate text-muted-foreground">{item.description}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
