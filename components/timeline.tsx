import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Reveal } from '@/components/motion/reveal'

export function Timeline({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="min-h-screen flex items-center bg-muted py-8">
      <div className="container mx-auto px-4">
        <Reveal preset="drop">
          <h2 className="text-4xl font-bold text-center mb-16 text-foreground">{title}</h2>
        </Reveal>
        <div className="relative">
          {/* Vertical line - hidden on mobile */}
          <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full bg-primary/20 hidden md:block" />
          {children}
        </div>
      </div>
    </section>
  )
}

/** One year on the timeline. Alternates sides on desktop based on `index`. */
export function TimelineItem({ year, index, children }: { year: string | null; index: number; children: ReactNode }) {
  const even = index % 2 === 0
  return (
    <div className="mb-12 md:mb-8 md:flex items-start">
      <Reveal preset="pop" className={`hidden md:block md:w-1/2 ${even ? 'md:pr-8 text-right' : 'md:pl-8 md:order-last'}`}>
        <h3 className="text-3xl font-bold text-primary mb-4">{year}</h3>
      </Reveal>
      <div className="w-8 h-8 absolute left-1/2 -translate-x-1/2 -translate-y-3 rounded-full bg-primary border-4 border-background hidden md:block" />
      <Reveal preset="rise" className={`w-full md:w-1/2 ${even ? 'md:ml-8' : 'md:mr-8'}`}>
        <Card className="hover:drop-shadow-md transition-shadow duration-300">
          <CardContent className="p-6">
            <h3 className="text-2xl font-bold text-primary mb-4 md:hidden">{year}</h3>
            {children}
          </CardContent>
        </Card>
      </Reveal>
    </div>
  )
}

/** Logo + title + badge row shared by education and work entries. */
export function TimelineEntryHeader({ logo, title, badge }: { logo?: ReactNode; title: string | null; badge: string | null }) {
  return (
    <div className="flex items-center mb-4">
      {logo && <div className="w-16 h-16 mr-4 relative flex-shrink-0">{logo}</div>}
      <div>
        <h4 className="font-semibold text-xl text-foreground my-2">{title}</h4>
        {badge && (
          <Badge variant="secondary" className="text-sm">
            {badge}
          </Badge>
        )}
      </div>
    </div>
  )
}
