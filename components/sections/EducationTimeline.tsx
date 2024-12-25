import Image from 'next/image'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { client } from '@/sanity/lib/client'
import { urlFor } from '@/sanity/lib/image'


interface Education {
  year: string
  degree: string
  school: string
  schoolLogo: {
    asset: {
      _ref: string
    }
  }
  desc: string
}

async function getEducation(): Promise<Education[]> {
  return client.fetch(`
    *[_type == "education"] | order(year desc) {
      year,
      degree,
      school,
      schoolLogo,
      desc
    }
  `)
}

export default async function EducationTimeline() {
  const educationList = await getEducation()

  if (!educationList || educationList.length === 0) {
    return <div className="text-center text-muted-foreground">No education history found.</div>
  }

  return (
    <section className="py-16 bg-background h-screen">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-16 text-foreground">Educational Journey</h2>
        <div className="relative">
          {/* Vertical line - hidden on mobile */}
          <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-primary/20 hidden md:block"></div>
          
          {educationList.map((edu, index) => (
            <div key={edu.year} className="mb-12 md:mb-0 md:flex items-start">
              <div className={`hidden md:block md:w-1/2 ${index % 2 === 0 ? 'md:pr-8 text-right' : 'md:pl-8 md:order-last'}`}>
                <h3 className="text-3xl font-bold text-primary mb-4">{edu.year}</h3>
              </div>
              <div className="w-8 h-8 absolute left-1/2 transform -translate-x-1/2 -translate-y-3 rounded-full bg-primary border-4 border-background hidden md:block"></div>
              <Card className={`w-full md:w-1/2 ${index % 2 === 0 ? 'md:ml-8' : 'md:mr-8'}`}>
                <CardContent className="p-6">
                  <h3 className="text-2xl font-bold text-primary mb-4 md:hidden">{edu.year}</h3>
                  <div className="flex items-center mb-4">
                    {edu.schoolLogo && (
                      <div className="w-16 h-16 mr-4 relative flex-shrink-0">
                        <Image
                          src={urlFor(edu.schoolLogo).width(64).height(64).url()}
                          alt={edu.school}
                          width={64}
                          height={64}
                          className="rounded-full object-contain bg-background p-1 border border-border"
                        />
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-xl text-foreground mb-1">{edu.degree}</h4>
                      <Badge variant="secondary" className="text-sm">{edu.school}</Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{edu.desc}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}