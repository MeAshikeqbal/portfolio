import { client } from '@/sanity/lib/client'
import TechStack from '@/components/tech-stack'


interface Skill {
  _id: string
  name: string
  /** Iconify icon name, e.g. `logos:aws`. */
  icon?: string
}

const getSkills = async (): Promise<Skill[]> => {
  return client.fetch(`
    *[_type == "skills"] | order(name asc) {
      _id,
      name,
      icon
    }
  `)
}

export default async function TechStackSection() {
    const skills = await getSkills()
  
    return <TechStack skills={skills} />
  }
  