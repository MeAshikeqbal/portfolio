//import EducationTimeline from "@/components/sections/EducationTimeline";
import { ContactSection } from "@/components/sections/contact-section";
import ExperiencesTimeline from "@/components/sections/ExperiencesTimeline";
import PostSection from "@/components/sections/LatestPostSection";
import { ProjectsSection } from "@/components/sections/projects-section";
import TechStack from "@/components/sections/tech-stack";

export default async function Home() {
  return (
    <main>
      <PostSection />
      {/*<EducationTimeline />*/}
      <ExperiencesTimeline />
      <ProjectsSection />
      <TechStack />
      <ContactSection />
    </main>
  )
}
