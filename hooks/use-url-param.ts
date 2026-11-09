"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useState } from "react"

/**
 * A string kept in the URL query (`?key=value`) so a filtered view is shareable.
 *
 * State is local, so inputs update instantly; the URL is updated shallowly with
 * `history.replaceState` (no server round trip; Next.js syncs it into `useSearchParams`).
 * When the URL changes from outside (Back, a link to a clean URL) the value follows it.
 */
export function useUrlParam(key: string): [string, (value: string) => void] {
  const pathname = usePathname()
  const params = useSearchParams()
  const urlValue = params.get(key) ?? ""

  const [value, setValue] = useState(urlValue)
  const [synced, setSynced] = useState(urlValue)
  if (urlValue !== synced) {
    setSynced(urlValue)
    setValue(urlValue)
  }

  function update(next: string) {
    const trimmed = next.trim()
    setValue(next)
    setSynced(trimmed)
    // Read the live URL so quick successive updates to different keys don't drop each other.
    const search = new URLSearchParams(window.location.search)
    if (trimmed) search.set(key, trimmed)
    else search.delete(key)
    const query = search.toString()
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname)
  }

  return [value, update]
}
