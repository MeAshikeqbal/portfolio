"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

/** Search field with a leading icon; `label` doubles as the accessible name and placeholder. */
export function SearchInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        placeholder={`${label}…`}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pl-9"
      />
    </div>
  )
}
