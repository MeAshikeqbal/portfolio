import { client } from '@/sanity/lib/client'
import TechStack from '@/components/tech-stack'

export const revalidate = 60

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

export default async function TechStackSection() {
    const skills = await getSkills()
  
    return <TechStack skills={skills} />
  }
  