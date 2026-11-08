import { getCvUrl } from '@/lib/api'
import { HeroContent } from './hero-content'

export default async function Hero() {
  const cvUrl = await getCvUrl()
  return <HeroContent cvUrl={cvUrl} />
}
