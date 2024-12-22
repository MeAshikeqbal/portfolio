import PostSection from "@/components/sections/LatestPostSection";
import { AnimatedThemeSwitch } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default async function Home() {
  return (
    <div>
      <h1>Home</h1>
      <Button>Click me</Button>
      <AnimatedThemeSwitch />
      <PostSection/>
    </div>
  )
}
