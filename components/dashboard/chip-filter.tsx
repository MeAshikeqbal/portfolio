"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface ChipFilterProps {
  label: string
  options: string[]
  /** How an option reads; defaults to the option itself (values stay stable in the URL). */
  formatOption?: (option: string) => string
  /** Selected option, or "" for all. */
  value: string
  onChange: (value: string) => void
  /** Show only the first `limit` options (plus the selected one) behind a "+N more" toggle. */
  limit?: number
}

const chip = "rounded-full border px-2.5 py-1 font-mono text-xs transition-colors"

/** A row of toggle chips for one filter dimension, with an "all" option. */
export function ChipFilter({
  label,
  options,
  formatOption,
  value,
  onChange,
  limit,
}: ChipFilterProps) {
  const t = useTranslations("common")
  const [expanded, setExpanded] = useState(false)
  const collapsible = limit !== undefined && options.length > limit + 1
  const shown =
    collapsible && !expanded
      ? options.filter((option, i) => i < limit || option === value)
      : options
  const hidden = options.length - shown.length

  return (
    <div className="flex items-start gap-2" role="group" aria-label={t("filterBy", { label })}>
      {/* Same height as a chip, so the label sits on the first row and wrapped rows align. */}
      <span className="flex h-[26px] w-16 shrink-0 items-center label-caps">{label}</span>
      <div className="flex flex-wrap gap-2">
        {["", ...shown].map((option) => {
          const active = value === option
          const text = option ? (formatOption?.(option) ?? option) : t("all")
          return (
            <button
              key={text}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option)}
              className={cn(
                chip,
                active
                  ? "border-foreground bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {text}
            </button>
          )
        })}
        {collapsible && (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((open) => !open)}
            className={cn(
              chip,
              "border-dashed text-muted-foreground hover:border-foreground hover:text-foreground",
            )}
          >
            {expanded ? t("fewer") : t("more", { count: hidden })}
          </button>
        )}
      </div>
    </div>
  )
}
