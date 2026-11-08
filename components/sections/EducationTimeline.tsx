import Image from "next/image"
import { Timeline, TimelineEntryHeader, TimelineItem } from "@/components/timeline"
import { getEducation } from "@/lib/api"
import { urlFor } from "@/sanity/lib/image"

export default async function EducationTimeline() {
  const education = await getEducation()
  if (education.length === 0) return null

  return (
    <Timeline id="Education-Journey" title="Education Journey">
      {education.map((edu, index) => (
        <TimelineItem key={edu._id} year={edu.year} index={index}>
          <TimelineEntryHeader
            title={edu.degree}
            badge={edu.school}
            logo={
              edu.schoolLogo?.asset && (
                <Image
                  src={urlFor(edu.schoolLogo).width(128).height(128).url()}
                  alt={edu.school ?? ""}
                  width={64}
                  height={64}
                  className="rounded-full border border-border bg-background object-contain p-1"
                />
              )
            }
          />
          {edu.desc && <p className="leading-relaxed text-muted-foreground">{edu.desc}</p>}
        </TimelineItem>
      ))}
    </Timeline>
  )
}
