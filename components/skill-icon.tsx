import { MONOCHROME_SETS, iconUrl } from "@/lib/icons"
import { cn } from "@/lib/utils"

interface SkillIconProps {
  /** Iconify icon name, e.g. `logos:aws` or `mdi:security`. */
  name: string
  label: string
  className?: string
}

/**
 * Renders a bundled Iconify icon served from `/icons/...`.
 * Monochrome sets are drawn with a CSS mask so they inherit `currentColor` (dark-mode safe);
 * multicolour sets (e.g. `logos`) render as a plain image.
 */
export function SkillIcon({ name, label, className }: SkillIconProps) {
  const url = iconUrl(name)
  if (!url) return null

  if (MONOCHROME_SETS.has(name.split(":")[0])) {
    const mask = `url(${url}) center / contain no-repeat`
    return (
      <span
        role="img"
        aria-label={label}
        className={cn("inline-block bg-current", className)}
        style={{ mask, WebkitMask: mask }}
      />
    )
  }

  return (
    // next/image would need `dangerouslyAllowSVG`; these are small, immutable, same-origin SVGs.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={label} loading="lazy" decoding="async" className={cn("object-contain", className)} />
  )
}
