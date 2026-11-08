import { BackToTop } from "@/components/back-to-top"
import { NavBar } from "@/components/NavBar"
import { SanityLive } from "@/sanity/lib/live"
import Footer from "@/components/sections/footer"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      {children}
      <Footer />
      <BackToTop />
      {/* Live content updates for the public site only (not the Studio or style guide). */}
      <SanityLive />
    </>
  )
}
