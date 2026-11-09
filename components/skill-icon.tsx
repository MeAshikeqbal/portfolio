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
 * Monochrome sets are drawn with a CSS mask so they inherit `currentColor` (dark-mode safe).
 * Multicolour sets (e.g. `logos`) render as an image in greyscale: colour on this site only
 * ever means status, so brand hues stay out. (A mask would turn filled logos, like
 * JavaScript's square, into a solid block; greyscale keeps their detail.)
 */
export function SkillIcon({ name, label, className }: SkillIconProps) {
  const url = iconUrl(name)
  if (!url) return null

  if (MONOCHROME_SETS.has(name.split(":")[0])) {
    const mask = `url(${url}) center / contain no-repeat`
    return (
      <span
        // An empty label marks the icon as decorative (e.g. when its name is printed beside it).
        role={label ? "img" : undefined}
        aria-label={label || undefined}
        aria-hidden={label ? undefined : true}
        className={cn("inline-block bg-current", className)}
        style={{ mask, WebkitMask: mask }}
      />
    )
  }

  return (
    // next/image would need `dangerouslyAllowSVG`; these are small, immutable, same-origin SVGs.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={label}
      loading="lazy"
      decoding="async"
      className={cn("object-contain grayscale", className)}
    />
  )
}
