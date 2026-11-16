import { notFound } from "next/navigation"

/**
 * Every URL no page matches lands here, inside the (site) layout, so its 404 (not-found.tsx
 * next to this folder) gets the site's chrome and the visitor's language.
 */
export default function CatchAll() {
  notFound()
}
