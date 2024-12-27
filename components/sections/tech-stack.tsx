import Image from 'next/image'
import { Card, CardContent } from "@/components/ui/card"
import { client } from '@/sanity/lib/client'
import { urlFor } from '@/sanity/lib/image'

interface Skill {
  name: string
  icon: {
    asset: {
      _ref: string
    }
  }
}

const getSkills = async (): Promise<Skill[]> => {
  return client.fetch(`
    *[_type == "skills"] {
      name,
      icon
    }
  `)
}

export default async function TechStack() {
  const skills = await getSkills()

  if (!skills || skills.length === 0) {
    return <div className="text-center text-muted-foreground">No skills found.</div>
  }

  return (
    <section id='Tech-Stack' className="min-h-screen flex items-center bg-muted">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-12 text-foreground">Tech Stack</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {skills.map((skill) => (
            <Card 
              key={skill.name} 
              className="flex flex-col items-center justify-center p-4 hover:shadow-lg transition-all duration-300 group hover:-translate-y-1"
            >
              <CardContent className="flex flex-col items-center p-0">
                {skill.icon && (
                  <div className="w-20 h-20 relative mb-4 rounded-full bg-muted overflow-hidden group-hover:bg-primary/10 transition-colors duration-300">
                    <Image
                      src={urlFor(skill.icon).width(80).height(80).url()}
                      alt={skill.name}
                      fill
                      className="object-contain bg-background/40 p-4 group-hover:scale-110 transition-transform duration-300"
                      sizes="(max-width: 640px) 80px, 160px"
                    />
                  </div>
                )}
                <h3 className="text-lg font-semibold text-center text-foreground group-hover:text-primary transition-colors duration-300">{skill.name}</h3>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}