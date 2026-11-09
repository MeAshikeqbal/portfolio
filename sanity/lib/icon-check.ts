import { iconUrl } from "../../lib/icons"

/**
 * Asks the site's icon route whether an Iconify name resolves to a bundled icon (the route
 * answers `X-Icon-Found: 1|0`). Resolves `null` when that can't be told: outside a browser
 * (e.g. `sanity documents validate` on the CLI), on a network error, or from a deploy without
 * the header. Malformed names are reported as missing.
 */
export async function iconExists(name: string): Promise<boolean | null> {
  const url = iconUrl(name)
  if (!url) return false
  if (typeof window === "undefined") return null
  try {
    const response = await fetch(url, { method: "HEAD" })
    const found = response.headers.get("x-icon-found")
    return found === null ? null : found === "1"
  } catch {
    return null
  }
}
