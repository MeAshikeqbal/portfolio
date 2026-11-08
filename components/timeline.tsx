import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Reveal } from "@/components/motion/reveal"

export function Timeline({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="flex min-h-screen items-center bg-muted py-8">
      <div className="container mx-auto px-4">
        <Reveal preset="drop">
          <h2 className="mb-16 text-center text-4xl font-bold text-foreground">{title}</h2>
        </Reveal>
        <div className="relative">
          {/* Vertical line - hidden on mobile */}
          <div className="absolute left-1/2 hidden h-full w-0.5 -translate-x-1/2 bg-primary/20 md:block" />
          {children}
        </div>
      </div>
    </section>
  )
}

/** One year on the timeline. Alternates sides on desktop based on `index`. */
export function TimelineItem({
  year,
  index,
  children,
}: {
  year: string | null
  index: number
  children: ReactNode
}) {
  const even = index % 2 === 0
  return (
    <div className="mb-12 items-start md:mb-8 md:flex">
      <Reveal
        preset="pop"
        className={`hidden md:block md:w-1/2 ${even ? "text-right md:pr-8" : "md:order-last md:pl-8"}`}
      >
        <h3 className="mb-4 text-3xl font-bold text-primary">{year}</h3>
      </Reveal>
      <div className="absolute left-1/2 hidden h-8 w-8 -translate-x-1/2 -translate-y-3 rounded-full border-4 border-background bg-primary md:block" />
      <Reveal preset="rise" className={`w-full md:w-1/2 ${even ? "md:ml-8" : "md:mr-8"}`}>
        <Card className="transition-shadow duration-300 hover:drop-shadow-md">
          <CardContent className="p-6">
            <h3 className="mb-4 text-2xl font-bold text-primary md:hidden">{year}</h3>
            {children}
          </CardContent>
        </Card>
      </Reveal>
    </div>
  )
}

/** Logo + title + badge row shared by education and work entries. */
export function TimelineEntryHeader({
  logo,
  title,
  badge,
}: {
  logo?: ReactNode
  title: string | null
  badge: string | null
}) {
  return (
    <div className="mb-4 flex items-center">
      {logo && <div className="relative mr-4 h-16 w-16 shrink-0">{logo}</div>}
      <div>
        <h4 className="my-2 text-xl font-semibold text-foreground">{title}</h4>
        {badge && (
          <Badge variant="secondary" className="text-sm">
            {badge}
          </Badge>
        )}
      </div>
    </div>
  )
}
