"use client"

import { Menu, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Container } from "@/components/dashboard/layout"
import { ThemeToggle } from "@/components/theme-toggle"
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

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <Container className="flex h-14 items-center justify-between gap-4">
        <Link
          href="/"
          className="font-mono text-sm font-medium tracking-tight"
          aria-label={`${siteConfig.name}, home`}
        >
          itsashik<span className="text-muted-foreground">.dev</span>
        </Link>

        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 md:flex">
          {siteConfig.nav.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-surface-2 text-foreground"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          {/* A single palette instance for every screen size (one keyboard listener). */}
          {commandIndex && <CommandMenu index={commandIndex} />}
          <ThemeToggle className="hidden md:flex" />
          <Button
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
          className="border-t bg-background md:hidden"
          onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
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
