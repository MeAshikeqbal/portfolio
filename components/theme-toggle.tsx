"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useHydrated } from "@/hooks/use-hydrated"
import { cn } from "@/lib/utils"

const OPTIONS = [
  { value: "system", label: "System theme", icon: Monitor },
  { value: "light", label: "Light theme", icon: Sun },
  { value: "dark", label: "Dark theme", icon: Moon },
] as const

/** Three-way theme switch (system / light / dark). Renders a same-size placeholder until hydrated. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const hydrated = useHydrated()

  return (
    <ToggleGroup
      type="single"
      size="sm"
      variant="outline"
      value={hydrated ? (theme ?? "system") : ""}
      onValueChange={(value) => value && setTheme(value)}
      aria-label="Colour theme"
      className={cn("h-8", className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          aria-label={label}
          title={label}
          className="h-8 w-8 px-0 data-[state=on]:bg-surface-2 data-[state=on]:text-foreground"
        >
          <Icon className="size-3.5" />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
