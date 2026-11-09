import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

/**
 * `false` during SSR and the hydration render, `true` afterwards.
 * Use to gate client-only UI (e.g. theme-dependent icons) without a setState-in-effect.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
