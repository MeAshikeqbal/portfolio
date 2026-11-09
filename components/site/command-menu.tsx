"use client"

import {
  ArrowUpRight,
  Code2,
  FileDown,
  FileText,
  FolderGit2,
  Home,
  Link2,
  Monitor,
  Moon,
  Rss,
  Search,
  Sun,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { useHydrated } from "@/hooks/use-hydrated"
import type { CommandIndex } from "@/lib/api"
import { projectHref } from "@/lib/projects"
import { siteConfig } from "@/lib/site"
import { cn } from "@/lib/utils"

/** True when the keyboard focus is somewhere the user types text. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
}

const sections = [
  { label: "Projects", href: "/#services", keywords: ["services", "work"] },
  { label: "Writing", href: "/#writing", keywords: ["incident log", "blog", "posts"] },
  { label: "Experience & education", href: "/#uptime", keywords: ["uptime", "cv", "history"] },
  { label: "Stack", href: "/#inventory", keywords: ["inventory", "skills", "tools"] },
  { label: "Contact", href: "/#contact", keywords: ["ticket", "email", "message"] },
]

/**
 * ⌘K / Ctrl+K (or "/") command palette: jump to any page, post or project, switch theme,
 * copy the current link, grab the résumé or open a social profile.
 */
export function CommandMenu({ index, className }: { index: CommandIndex; className?: string }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { setTheme } = useTheme()
  const hydrated = useHydrated()
  // Platform is only known in the browser; until hydration, show the Mac glyph like the server.
  const modKey = hydrated && !/Mac|iPhone|iPad/.test(navigator.userAgent) ? "Ctrl" : "⌘"

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const shortcut = (event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)
      const slash = event.key === "/" && !event.metaKey && !event.ctrlKey && !isTyping(event.target)
      if (shortcut || slash) {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  /** Closes the palette, then runs the action. */
  function run(action: () => void) {
    setOpen(false)
    action()
  }

  const go = (href: string) => run(() => router.push(href))
  const visit = (href: string) => run(() => window.open(href, "_blank", "noopener,noreferrer"))

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Search and commands"
        aria-keyshortcuts="Control+K Meta+K /"
        className={cn("gap-2 text-muted-foreground", className)}
      >
        <Search />
        <span className="hidden lg:inline">Search…</span>
        <KbdGroup className="hidden lg:inline-flex">
          <Kbd>{modKey}</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search and commands"
        description="Jump to a page, post or project, or run an action."
      >
        <CommandInput placeholder="Search pages, posts, projects, actions…" />
        {/* No CommandSeparator: it renders role="separator" inside the listbox, which ARIA
            doesn't allow (axe: aria-required-children). Group headings separate sections. */}
        <CommandList className="max-h-[min(70vh,28rem)]">
          <CommandEmpty>No results.</CommandEmpty>

          <CommandGroup heading="Navigate">
            <Item icon={<Home />} onSelect={() => go("/")} keywords={["start", "index"]}>
              Home
            </Item>
            <Item icon={<FolderGit2 />} onSelect={() => go("/projects")}>
              All projects
            </Item>
            <Item icon={<FileText />} onSelect={() => go("/post")} keywords={["blog"]}>
              All posts
            </Item>
            {sections.map((section) => (
              <Item
                key={section.href}
                onSelect={() => go(section.href)}
                keywords={section.keywords}
              >
                <span className="text-muted-foreground">Home ›</span> {section.label}
              </Item>
            ))}
          </CommandGroup>
          <CommandGroup heading="Actions">
            <Item
              icon={<Monitor />}
              onSelect={() => run(() => setTheme("system"))}
              keywords={["theme", "auto"]}
            >
              Use system theme
            </Item>
            <Item
              icon={<Sun />}
              onSelect={() => run(() => setTheme("light"))}
              keywords={["theme", "mode"]}
            >
              Switch to light theme
            </Item>
            <Item
              icon={<Moon />}
              onSelect={() => run(() => setTheme("dark"))}
              keywords={["theme", "mode"]}
            >
              Switch to dark theme
            </Item>
            <Item
              icon={<Link2 />}
              keywords={["share", "url", "clipboard"]}
              onSelect={() =>
                run(async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href)
                    toast.success("Link copied")
                  } catch {
                    toast.error("Couldn't copy the link")
                  }
                })
              }
            >
              Copy link to this page
            </Item>
            {index.hasCv && (
              <Item
                icon={<FileDown />}
                onSelect={() => visit("/resume.pdf")}
                keywords={["cv", "resume", "download"]}
              >
                Open résumé
              </Item>
            )}
            <Item
              icon={<Rss />}
              onSelect={() => visit("/rss.xml")}
              keywords={["feed", "subscribe"]}
            >
              RSS feed
            </Item>
            <Item
              icon={<Code2 />}
              onSelect={() => visit(siteConfig.repo)}
              keywords={["github", "code"]}
            >
              View this site&apos;s source
            </Item>
          </CommandGroup>

          {index.posts.length > 0 && (
            <>
              <CommandGroup heading="Posts">
                {index.posts.map((post) => (
                  <Item
                    key={post._id}
                    value={`post ${post.title} ${post._id}`}
                    keywords={(post.topics ?? []).filter((t): t is string => Boolean(t))}
                    icon={<FileText />}
                    onSelect={() => go(`/post/${post.slug}`)}
                  >
                    {post.title}
                  </Item>
                ))}
              </CommandGroup>
            </>
          )}

          {index.projects.length > 0 && (
            <>
              <CommandGroup heading="Projects">
                {index.projects.map((project) => {
                  const href = projectHref(project)
                  if (!href) return null
                  const external = !href.startsWith("/")
                  return (
                    <Item
                      key={project._id}
                      value={`project ${project.title} ${project._id}`}
                      icon={<FolderGit2 />}
                      onSelect={() => (external ? visit(href) : go(href))}
                    >
                      {project.title}
                      {external && <ArrowUpRight className="ml-auto" />}
                    </Item>
                  )
                })}
              </CommandGroup>
            </>
          )}
          <CommandGroup heading="Elsewhere">
            {siteConfig.socialLinks.map((link) => (
              <Item
                key={link.href}
                icon={<ArrowUpRight />}
                onSelect={() => visit(link.href)}
                keywords={["social"]}
              >
                {link.label}
              </Item>
            ))}
          </CommandGroup>
        </CommandList>
        <div className="flex items-center justify-between border-t px-3 py-2 label-caps">
          <span>↑↓ to move · ↵ to open</span>
          <CommandShortcut className="tracking-[0.08em]">esc to close</CommandShortcut>
        </div>
      </CommandDialog>
    </>
  )
}

function Item({
  icon,
  children,
  ...props
}: { icon?: ReactNode; children: ReactNode } & React.ComponentProps<typeof CommandItem>) {
  return (
    <CommandItem {...props}>
      {icon}
      {children}
    </CommandItem>
  )
}
