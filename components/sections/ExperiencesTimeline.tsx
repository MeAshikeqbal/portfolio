import Image from 'next/image'
import { Separator } from '@/components/ui/separator'
import { Timeline, TimelineEntryHeader, TimelineItem } from '@/components/timeline'
import { getExperiences } from '@/lib/api'
import { urlFor } from '@/sanity/lib/image'

export default async function ExperiencesTimeline() {
  const experiences = await getExperiences()
  if (experiences.length === 0) return null

  return (
    <Timeline id="Professional-Journey" title="Professional Journey">
      {experiences.map((experience, index) => {
        const works = experience.works ?? []
        return (
          <TimelineItem key={experience._id} year={experience.year} index={index}>
            {works.map((work, workIndex) => (
              <div key={work._key} className="mb-8 last:mb-0">
                <TimelineEntryHeader
                  title={work.name}
                  badge={work.company}
                  logo={
                    // The schema field is spelled `copmanyLogo`; renaming it would orphan existing data.
                    work.copmanyLogo?.asset && (
                      <Image
                        src={urlFor(work.copmanyLogo).width(128).height(128).url()}
                        alt={work.company ?? ''}
                        width={64}
                        height={64}
                        className="rounded-full object-contain bg-background p-1 border border-border"
                      />
                    )
                  }
                />
                {work.desc && <p className="text-muted-foreground leading-relaxed">{work.desc}</p>}
                {workIndex < works.length - 1 && <Separator className="my-6" />}
              </div>
            ))}
          </TimelineItem>
        )
      })}
    </Timeline>
  )
}
