import type { Fetch } from "@/lib/live/http"

type Handler = (
  url: URL,
  init?: RequestInit,
) => Response | Promise<Response> | "timeout" | "network"

/** A fetch stand-in that routes by "METHOD host/path" prefix and records every call. */
export function fakeFetch(routes: Record<string, Handler>) {
  const calls: { url: string; init?: RequestInit }[] = []
  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input.toString())
    calls.push({ url: url.toString(), init })
    const key = `${init?.method ?? "GET"} ${url.host}${url.pathname}`
    const route = Object.keys(routes).find((prefix) => key.startsWith(prefix))
    if (!route) throw new Error(`unexpected request: ${key}`)
    const result = await routes[route](url, init)
    if (result === "timeout") throw new DOMException("timed out", "TimeoutError")
    if (result === "network") throw new TypeError("fetch failed")
    return result
  }) as Fetch
  return { impl, calls }
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
export const empty = (status = 204) => new Response(null, { status })
export const malformed = () =>
  new Response("{not json", { status: 200, headers: { "content-type": "application/json" } })

export const spotifyTrack = (name: string) => ({
  name,
  artists: [{ name: "Artist A" }, { name: "Artist B" }],
  album: {
    images: [
      { url: "https://i.scdn.co/image/640", width: 640 },
      { url: "https://i.scdn.co/image/300", width: 300 },
      { url: "https://i.scdn.co/image/64", width: 64 },
    ],
  },
  external_urls: { spotify: `https://open.spotify.com/track/${name.toLowerCase()}` },
})
