"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

interface ChipFilterProps {
  label: string
  options: string[]
  /** How an option reads; defaults to the option itself (values stay stable in the URL). */
  formatOption?: (option: string) => string
  /** Selected option, or "" for all. */
  value: string
  onChange: (value: string) => void
}

/** A row of toggle chips for one filter dimension, with an "all" option. */
export function ChipFilter({ label, options, formatOption, value, onChange }: ChipFilterProps) {
  const t = useTranslations("common")
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label={t("filterBy", { label })}
    >
      <span className="w-16 label-caps">{label}</span>
      {["", ...options].map((option) => {
        const active = value === option
        return (
          <button
            key={option ? (formatOption?.(option) ?? option) : t("all")}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option)}
            className={cn(
              "rounded-full border px-2.5 py-1 font-mono text-xs transition-colors",
              active
                ? "border-foreground bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option ? (formatOption?.(option) ?? option) : t("all")}
          </button>
        )
      })}
    </div>
  )
}
