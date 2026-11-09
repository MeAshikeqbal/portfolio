import { flushSync } from "react-dom"

/**
 * Runs a DOM-wide visual change (the theme switch) inside a view transition, so the page
 * crossfades instead of flashing. Falls back to an instant change without browser support or
 * when the visitor prefers reduced motion. `flushSync` makes React (and next-themes' effect)
 * apply the change inside the transition's update callback.
 */
export function withViewTransition(kind: string, update: () => void) {
  if (
    typeof document === "undefined" ||
    !("startViewTransition" in document) ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    update()
    return
  }
  const root = document.documentElement
  root.dataset.transition = kind
  const transition = document.startViewTransition(() => flushSync(update))
  transition.finished.finally(() => delete root.dataset.transition)
}
