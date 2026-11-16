"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTranslations } from "next-intl"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useHydrated } from "@/hooks/use-hydrated"
import { withViewTransition } from "@/lib/view-transition"
import { cn } from "@/lib/utils"

const OPTIONS = [
  { value: "system", label: "themeSystem", icon: Monitor },
  { value: "light", label: "themeLight", icon: Sun },
  { value: "dark", label: "themeDark", icon: Moon },
] as const

/**
 * One icon button for the header that steps system → light → dark. Its name says the current
 * mode ("Colour theme: dark") and its tooltip the next one. Until hydrated it shows the system
 * icon at the same size, since the stored choice isn't known on the server.
 */
export function ThemeCycleButton({ className }: { className?: string }) {
  const t = useTranslations("ui")
  const { theme, setTheme } = useTheme()
  const hydrated = useHydrated()
  const index = hydrated
    ? Math.max(
        0,
        OPTIONS.findIndex((option) => option.value === theme),
      )
    : 0
  const current = OPTIONS[index]
  const next = OPTIONS[(index + 1) % OPTIONS.length]
  const Icon = current.icon

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => withViewTransition("theme", () => setTheme(next.value))}
      aria-label={
        hydrated
          ? t("themeCurrent", { theme: t("themeNames", { theme: current.value }) })
          : t("themeLabel")
      }
      title={hydrated ? t("themeNext", { theme: next.value }) : undefined}
      className={cn("text-muted-foreground hover:text-foreground", className)}
    >
      <Icon className="size-4" />
    </Button>
  )
}

/** Three-way theme switch (system / light / dark). Renders a same-size placeholder until hydrated. */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("ui")
  const { theme, setTheme } = useTheme()
  const hydrated = useHydrated()

  return (
    <ToggleGroup
      type="single"
      size="sm"
      variant="outline"
      value={hydrated ? (theme ?? "system") : ""}
      onValueChange={(value) => value && withViewTransition("theme", () => setTheme(value))}
      aria-label={t("themeLabel")}
      className={cn("h-8", className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          aria-label={t(label)}
          title={t(label)}
          className="h-8 w-8 px-0 data-[state=on]:bg-surface-2 data-[state=on]:text-foreground"
        >
          <Icon className="size-3.5" />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
