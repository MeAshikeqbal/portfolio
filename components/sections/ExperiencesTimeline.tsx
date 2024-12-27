import Image from 'next/image'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { client } from '@/sanity/lib/client'
import { urlFor } from '@/sanity/lib/image'

interface Work {
    name: string
    company: string
    companyLogo: {
        asset: {
            _ref: string
        }
    }
    desc: string
}

interface Experience {
    year: string
    works: Work[]
}

const getExperiences = async (): Promise<Experience[]> => {
    return client.fetch(`
    *[_type == "experiences"] | order(year desc) {
      year,
      works[] {
        name,
        company,
        companyLogo,
        desc
      }
    }
  `)
}

export default async function ExperiencesTimeline() {
    const experiences = await getExperiences()

    if (!experiences || experiences.length === 0) {
        return <div className="min-h-screen flex items-center justify-center text-center text-muted-foreground">No experiences found.</div>
    }

    return (
        <section id='Professional-Journey' className="min-h-screen flex items-center bg-muted">
            <div className="container mx-auto px-4 py-16">
                <h2 className="text-4xl font-bold text-center mb-16 text-foreground">Professional Journey</h2>
                <div className="relative">
                    {/* Vertical line - hidden on mobile */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-primary/20 hidden md:block"></div>

                    {experiences.map((exp, index) => (
                        <div key={exp.year} className="mb-12 md:mb-0 md:flex items-start">
                            <div className={`hidden md:block md:w-1/2 ${index % 2 === 0 ? 'md:pr-8 text-right' : 'md:pl-8 md:order-last'}`}>
                                <h3 className="text-3xl font-bold text-primary mb-4">{exp.year}</h3>
                            </div>
                            <div className="w-8 h-8 absolute left-1/2 transform -translate-x-1/2 -translate-y-3 rounded-full bg-primary border-4 border-background hidden md:block"></div>
                            <Card className={`w-full md:w-1/2 ${index % 2 === 0 ? 'md:ml-8' : 'md:mr-8'}`}>
                                <CardContent className="p-6">
                                    <h3 className="text-2xl font-bold text-primary mb-4 md:hidden">{exp.year}</h3>
                                    {exp.works.map((work, workIndex) => (
                                        <div key={workIndex} className="mb-8 last:mb-0">
                                            <div className="flex items-center mb-4">
                                                {work.companyLogo && (
                                                    <div className="w-16 h-16 mr-4 relative flex-shrink-0">
                                                        <Image
                                                            src={urlFor(work.companyLogo).width(64).height(64).url()}
                                                            alt={work.company}
                                                            width={64}
                                                            height={64}
                                                            className="rounded-full object-contain bg-background p-1 border border-border"
                                                            sizes="(max-width: 640px) 64px, 128px"
                                                        />
                                                    </div>
                                                )}
                                                <div>
                                                    <h4 className="font-semibold text-xl text-foreground my-2">{work.name}</h4>
                                                    <Badge variant="secondary" className="text-sm">{work.company}</Badge>
                                                </div>
                                            </div>
                                            <p className="text-muted-foreground leading-relaxed">{work.desc}</p>
                                            {workIndex < exp.works.length - 1 && <Separator className="my-6" />}
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}