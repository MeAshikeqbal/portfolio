import { cn } from "@/lib/utils"

/** Iconify sets whose icons are single-colour and should follow the text colour. */
const MONOCHROME_PREFIXES = new Set(["mdi", "simple-icons", "ri"])

const ICONIFY_NAME = /^[a-z0-9-]+:[a-z0-9-]+$/

/** Returns the Iconify CDN URL for a name like `logos:aws`, or null if the name is malformed. */
export function iconifyUrl(name: string): string | null {
  if (!ICONIFY_NAME.test(name)) return null
  const [prefix, icon] = name.split(":")
  return `https://api.iconify.design/${prefix}/${icon}.svg`
}

interface SkillIconProps {
  /** Iconify icon name, e.g. `logos:aws` or `mdi:security`. */
  name: string
  label: string
  className?: string
}

/**
 * Renders an Iconify icon from the public Iconify CDN.
 * Monochrome sets are drawn with a CSS mask so they inherit `currentColor` (dark-mode safe);
 * multicolour sets (e.g. `logos`) render as a plain image.
 */
export function SkillIcon({ name, label, className }: SkillIconProps) {
  const url = iconifyUrl(name)
  if (!url) return null

  if (MONOCHROME_PREFIXES.has(name.split(":")[0])) {
    return (
      <span
        role="img"
        aria-label={label}
        className={cn("inline-block bg-current", className)}
        style={{
          maskImage: `url(${url})`,
          WebkitMaskImage: `url(${url})`,
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
        }}
      />
    )
  }

  return (
    // next/image would need `dangerouslyAllowSVG`; these are small, cacheable CDN SVGs.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={label} loading="lazy" decoding="async" className={cn("object-contain", className)} />
  )
}
