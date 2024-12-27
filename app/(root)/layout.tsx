import { BackToTop } from "@/components/back-to-top"
import { NavBar } from "@/components/NavBar"
import Footer from "@/components/sections/footer"

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            <NavBar />
            {children}
            <BackToTop />
            <Footer />
        </>
    )
}
