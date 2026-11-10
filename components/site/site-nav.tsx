"use client"

import { Menu, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Container } from "@/components/dashboard/layout"
import { ThemeCycleButton, ThemeToggle } from "@/components/theme-toggle"
import type { CommandIndex } from "@/lib/api"
import { CommandMenu } from "./command-menu"
import { Button } from "@/components/ui/button"
import { siteConfig } from "@/lib/site"
import { cn } from "@/lib/utils"

/** A route link is active on its own page and any page beneath it; hash links never are. */
function isActive(pathname: string, href: string) {
  if (href.includes("#")) return false
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SiteNav({ commandIndex }: { commandIndex?: CommandIndex }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const header = useRef<HTMLElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)

  // The open menu covers most of a phone screen, so any sign of moving on closes it:
  // Escape (focus returns to the toggle), a tap outside, scrolling, or a route change.
  useEffect(() => {
    if (!open) return
    const startY = window.scrollY
    const close = () => setOpen(false)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      close()
      toggle.current?.focus()
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) close()
    }
    const onScroll = () => {
      if (Math.abs(window.scrollY - startY) > 24) close()
    }
    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("pointerdown", onPointerDown)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("scroll", onScroll)
    }
  }, [open])

  // Close on navigation (links also close on click; this covers back/forward and the palette).
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setOpen(false)
  }

  return (
    <header ref={header} className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <Container className="flex h-14 items-center justify-between gap-4">
        <Link
          href="/"
          className="font-mono text-sm font-medium tracking-tight"
          aria-label={`${siteConfig.name}, home`}
        >
          itsashik<span className="text-muted-foreground">.dev</span>
        </Link>

        {/* Links fill the header's height so the active one's underline sits on its border. */}
        <nav aria-label="Main" className="ml-auto hidden self-stretch md:flex">
          {siteConfig.nav.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center rounded-md px-3 text-sm transition-colors",
                  "after:absolute after:inset-x-3 after:-bottom-px after:h-px after:transition-colors",
                  active
                    ? "text-foreground after:bg-foreground"
                    : "text-muted-foreground hover:text-foreground hover:after:bg-border-strong",
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <span aria-hidden className="hidden h-4 w-px bg-border md:block" />

        <div className="flex items-center gap-1">
          {/* A single palette instance for every screen size (one keyboard listener). */}
          {commandIndex && <CommandMenu index={commandIndex} />}
          <ThemeCycleButton className="hidden md:inline-flex" />
          <Button
            ref={toggle}
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label="Toggle menu"
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </Container>

      {open && (
        <nav
          id="mobile-menu"
          aria-label="Main"
          // Opens with a short drop; closes instantly (any scroll or tap dismisses it).
          className="animate-in border-t bg-background duration-200 fade-in-0 motion-safe:slide-in-from-top-2 md:hidden"
        >
          <Container className="flex flex-col gap-1 py-3">
            {siteConfig.nav.map((item) => {
              const active = isActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-2.5 text-base",
                    active ? "bg-surface-2 text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
            <div className="mt-2 flex items-center justify-between border-t px-3 pt-3">
              <span className="label-caps">Theme</span>
              <ThemeToggle />
            </div>
          </Container>
        </nav>
      )}
    </header>
  )
}
