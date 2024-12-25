import { NavBar } from "@/components/NavBar"
import Footer from "@/components/sections/footer"

export default function StudioLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            <NavBar />
            {children}
            <Footer />
        </>
    )
}
