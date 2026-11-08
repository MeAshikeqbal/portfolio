import TechStack from '@/components/tech-stack'
import { getSkills } from '@/lib/api'

export default async function TechStackSection() {
  const skills = await getSkills()
  return <TechStack skills={skills} />
}
