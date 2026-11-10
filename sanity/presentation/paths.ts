/** Path on the site that shows a document, or null when it has no page of its own. */
export function sitePath(type: string, slug?: string | null): string | null {
  switch (type) {
    case "post":
      return slug ? `/post/${slug}` : null
    case "project":
      return slug ? `/projects/${slug}` : null
    case "uses":
      return "/homecave"
    case "now":
      return "/now"
    default:
      return null
  }
}

/** Document types that have a page of their own. */
export const TYPES_WITH_PAGES = new Set(["post", "project", "uses", "now"])
