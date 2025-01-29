"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Moon, Sun, Menu, X, ChevronLeft } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { AnimatedThemeSwitch } from "./theme-toggle"
import { motion, AnimatePresence } from "framer-motion"

const homeNavItems = [
  { name: "Home", path: "/#Home" },
  { name: "Blog", path: "/#Blog" },
  { name: "Educational Journey", path: "/#Education-Journey" },
  { name: "Projects", path: "/#Project" },
  { name: "Tech Stack", path: "/#Tech-Stack" },
  { name: "Contact", path: "/#Contact" },
]

export function NavBar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [activeSection, setActiveSection] = useState("")

  const handleScroll = useCallback(() => {
    const sections = homeNavItems.map((item) => item.path.substring(2))
    let currentSection = ""

    for (const section of sections) {
      const element = document.getElementById(section)
      if (element && element.getBoundingClientRect().top <= 100) {
        currentSection = section
      } else {
        break
      }
    }

    setActiveSection(currentSection)
  }, [])

  useEffect(() => {
    setMounted(true)
    if (pathname === "/") {
      window.addEventListener("scroll", handleScroll)
      return () => window.removeEventListener("scroll", handleScroll)
    }
  }, [pathname, handleScroll])

  const toggleMenu = () => setIsOpen(!isOpen)

  const closeMenu = () => setIsOpen(false)

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault()
    if (pathname === "/") {
      const id = path.substring(2)
      const element = document.getElementById(id)
      if (element) {
        element.scrollIntoView({ behavior: "smooth" })
      }
    } else {
      window.location.href = path
    }
    closeMenu()
  }

  const menuVariants = {
    open: { opacity: 1, height: "auto" },
    closed: { opacity: 0, height: 0 },
  }

  const getNavItems = () => {
    if (pathname === "/") return homeNavItems
    if (pathname === "/post" || pathname === "/projects") return [{ name: "Back to Home", path: "/" }]
    if (pathname.startsWith("/post/"))
      return [
        { name: "Back to All Post", path: "/post" },
        { name: "Back to Home", path: "/" },
      ]
    return [{ name: "Back to Home", path: "/" }]
  }

  const navItems = getNavItems()

  return (
    <motion.nav
      className="bg-background/90 shadow-sm fixed top-0 left-0 right-0 z-50 backdrop-blur-sm w-full"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-primary hover:text-primary/80 transition-colors">
              Ashik Eqbal
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.path}
                onClick={(e) => handleLinkClick(e, item.path)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
                  (pathname === "/" && activeSection === item.path.substring(2)) ||
                  (pathname !== "/" && item.path === pathname)
                    ? "text-primary"
                    : "text-foreground hover:text-primary"
                }`}
              >
                {item.name.startsWith("Back") && <ChevronLeft className="inline mr-1" />}
                {item.name}
                {pathname === "/" && activeSection === item.path.substring(2) && (
                  <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" layoutId="underline" />
                )}
              </Link>
            ))}
            {mounted && <AnimatedThemeSwitch />}
          </div>
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMenu}
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
              aria-label="Toggle menu"
            >
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={isOpen ? "close" : "open"}
                  initial={{ opacity: 0, rotate: -180 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 180 }}
                  transition={{ duration: 0.2 }}
                >
                  {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </motion.div>
              </AnimatePresence>
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="md:hidden"
            id="mobile-menu"
            initial="closed"
            animate="open"
            exit="closed"
            variants={menuVariants}
            transition={{ duration: 0.2 }}
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.path}
                  onClick={(e) => handleLinkClick(e, item.path)}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    (pathname === "/" && activeSection === item.path.substring(2)) ||
                    (pathname !== "/" && item.path === pathname)
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {item.name.startsWith("Back") && <ChevronLeft className="inline mr-1" />}
                  {item.name}
                </Link>
              ))}
              {mounted && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="w-full justify-start"
                >
                  <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="ml-2">Toggle theme</span>
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}