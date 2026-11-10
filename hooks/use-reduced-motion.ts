import { useSyncExternalStore } from "react"

const QUERY = "(prefers-reduced-motion: reduce)"

// Without matchMedia (very old browsers, jsdom) we can't ask, so assume less motion.
const canAsk = () => typeof window.matchMedia === "function"

function subscribe(onChange: () => void) {
  if (!canAsk()) return () => {}
  const media = window.matchMedia(QUERY)
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}

/**
 * Whether the visitor asked for less motion, kept in sync if they change it. Reads `true` on
 * the server, so nothing starts moving before the browser has had a say.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !canAsk() || window.matchMedia(QUERY).matches,
    () => true,
  )
}
