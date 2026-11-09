import { useCallback, useEffect, useState } from "react"
import { useClient } from "sanity"

const API_VERSION = "2026-11-01"

export interface QueryState<T> {
  data?: T
  error?: Error
  loading: boolean
  refresh: () => void
}

/**
 * Runs a GROQ query with the logged-in user's client (so it can read drafts and private
 * datasets the user has access to). `dataset` targets another dataset in the same project.
 */
export function useStudioQuery<T>(
  query: string,
  { params = {}, dataset }: { params?: Record<string, unknown>; dataset?: string } = {},
): QueryState<T> {
  const client = useClient({ apiVersion: API_VERSION })
  const [state, setState] = useState<{ data?: T; error?: Error; loading: boolean }>({
    loading: true,
  })
  const [nonce, setNonce] = useState(0)
  const paramsKey = JSON.stringify(params)

  useEffect(() => {
    let cancelled = false
    const scoped = dataset ? client.withConfig({ dataset }) : client
    scoped
      .fetch<T>(query, JSON.parse(paramsKey), { perspective: "raw" })
      .then((data) => !cancelled && setState({ data, loading: false }))
      .catch((error: Error) => !cancelled && setState({ error, loading: false }))
    return () => {
      cancelled = true
    }
  }, [client, query, paramsKey, dataset, nonce])

  const refresh = useCallback(() => setNonce((n) => n + 1), [])
  return { ...state, refresh }
}
