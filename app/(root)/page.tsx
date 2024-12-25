//import EducationTimeline from "@/components/sections/EducationTimeline";
import ExperiencesTimeline from "@/components/sections/ExperiencesTimeline";
import PostSection from "@/components/sections/LatestPostSection";

export default async function Home() {
  return (
    <main>
      <PostSection />
      {/*<EducationTimeline />*/}
      <ExperiencesTimeline />
    </main>
  )
}
