import type { IconifyJSON } from "@iconify/types"
import { getIconData, iconToHTML, iconToSVG } from "@iconify/utils"

/** Icon sets bundled with the site. Add a set here (and its `@iconify-json/*` package) to use it. */
const ICON_SETS: Record<string, () => Promise<IconifyJSON>> = {
  logos: () => import("@iconify-json/logos/icons.json").then((m) => m.default as IconifyJSON),
  mdi: () => import("@iconify-json/mdi/icons.json").then((m) => m.default as IconifyJSON),
  "simple-icons": () =>
    import("@iconify-json/simple-icons/icons.json").then((m) => m.default as IconifyJSON),
  ri: () => import("@iconify-json/ri/icons.json").then((m) => m.default as IconifyJSON),
}

/** Single-colour sets: rendered with `currentColor` so they follow the theme. */
export const MONOCHROME_SETS = new Set(["mdi", "simple-icons", "ri"])

const ICON_NAME = /^[a-z0-9-]+:[a-z0-9-]+$/

function isIconName(name: string): boolean {
  return ICON_NAME.test(name)
}

/** Same-origin URL for an Iconify name like `logos:aws`, or null if the name is malformed. */
export function iconUrl(name: string): string | null {
  if (!isIconName(name)) return null
  const [prefix, icon] = name.split(":")
  return `/icons/${prefix}/${icon}.svg`
}

/** Renders an icon to a standalone SVG string, or null if the set or icon doesn't exist. */
export async function renderIconSvg(prefix: string, icon: string): Promise<string | null> {
  const loadSet = ICON_SETS[prefix]
  if (!loadSet || !isIconName(`${prefix}:${icon}`)) return null

  const data = getIconData(await loadSet(), icon)
  if (!data) return null

  const { attributes, body } = iconToSVG(data, { height: "auto" })
  // Each icon is served as its own document, so gradient/clip-path IDs can't collide.
  return iconToHTML(body, attributes)
}
