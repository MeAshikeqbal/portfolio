"use client"

import { useEffect, useState } from "react"
import type { TocEntry } from "@/lib/portable-text"
import { cn } from "@/lib/utils"

/** "On this page" links with the section currently being read highlighted. */
export function TableOfContents({
  entries,
  className,
}: {
  entries: TocEntry[]
  className?: string
}) {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    const headings = entries
      .map((entry) => document.getElementById(entry.id))
      .filter((el): el is HTMLElement => Boolean(el))
    if (headings.length === 0) return

    // A heading becomes active once it passes into the top third of the viewport.
    const observer = new IntersectionObserver(
      (records) => {
        const visible = records.filter((r) => r.isIntersecting).map((r) => r.target.id)
        if (visible.length > 0) setActive(visible[0])
      },
      { rootMargin: "-80px 0px -66% 0px" },
    )
    headings.forEach((heading) => observer.observe(heading))
    return () => observer.disconnect()
  }, [entries])

  return (
    <nav aria-label="On this page" className={className}>
      <p className="mb-3 label-caps">on this page</p>
      <ol className="space-y-2 border-l text-sm">
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              aria-current={active === entry.id ? "location" : undefined}
              className={cn(
                "-ml-px block border-l py-0.5 transition-colors",
                entry.level === 3 ? "pl-6" : "pl-3",
                active === entry.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
