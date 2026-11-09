import { describe, expect, it } from "vitest"
import { getTraktActivity } from "@/lib/live/trakt"
import { empty, fakeFetch, json, malformed } from "./live-fixtures"

type Routes = Parameters<typeof fakeFetch>[0]

const env = { TRAKT_CLIENT_ID: "client", TRAKT_USERNAME: "someone" }
const WATCHING = "GET api.trakt.tv/users/someone/watching"
const HISTORY = "GET api.trakt.tv/users/someone/history"

const episode = {
  type: "episode",
  watched_at: "2026-11-08T21:00:00.000Z",
  show: { title: "The Show", year: 2022, ids: { slug: "the-show" } },
  episode: { title: "Pilot", season: 1, number: 1 },
}
const movie = {
  type: "movie",
  watched_at: "2026-11-07T21:00:00.000Z",
  movie: { title: "A Movie", year: 2021, ids: { slug: "a-movie-2021" } },
}

describe("getTraktActivity", () => {
  it("returns what's being watched, with an episode link", async () => {
    const { impl, calls } = fakeFetch({ [WATCHING]: () => json(episode) })
    expect(await getTraktActivity(env, impl)).toEqual({
      state: "watching",
      kind: "episode",
      title: "Pilot",
      show: "The Show",
      season: 1,
      episode: 1,
      year: 2022,
      url: "https://trakt.tv/shows/the-show/seasons/1/episodes/1",
      at: null,
    })
    expect(calls[0].init?.headers).toMatchObject({
      "trakt-api-key": "client",
      "trakt-api-version": "2",
    })
  })

  it("falls back to the last history entry", async () => {
    const { impl } = fakeFetch({ [WATCHING]: () => empty(204), [HISTORY]: () => json([movie]) })
    expect(await getTraktActivity(env, impl)).toMatchObject({
      state: "last",
      kind: "movie",
      title: "A Movie",
      url: "https://trakt.tv/movies/a-movie-2021",
      at: "2026-11-07T21:00:00.000Z",
    })
  })

  it("is null with an empty history or an unknown type", async () => {
    const emptyHistory = fakeFetch({ [WATCHING]: () => empty(204), [HISTORY]: () => json([]) })
    expect(await getTraktActivity(env, emptyHistory.impl)).toBeNull()
    const unknown = fakeFetch({
      [WATCHING]: () => empty(204),
      [HISTORY]: () => json([{ type: "season" }]),
    })
    expect(await getTraktActivity(env, unknown.impl)).toBeNull()
  })

  it.each<[string, Routes]>([
    ["a private profile (401)", { [WATCHING]: () => empty(401), [HISTORY]: () => empty(401) }],
    ["a 500", { [WATCHING]: () => empty(500), [HISTORY]: () => empty(500) }],
    ["malformed JSON", { [WATCHING]: malformed, [HISTORY]: malformed }],
    ["a timeout", { [WATCHING]: () => "timeout" as const, [HISTORY]: () => "timeout" as const }],
    ["a non-array history", { [WATCHING]: () => empty(204), [HISTORY]: () => json({ oops: 1 }) }],
  ])("is null after %s", async (_, routes) => {
    const { impl } = fakeFetch(routes)
    expect(await getTraktActivity(env, impl)).toBeNull()
  })

  it("drops links built from suspicious slugs", async () => {
    const { impl } = fakeFetch({
      [WATCHING]: () => json({ ...movie, movie: { ...movie.movie, ids: { slug: "../../x" } } }),
    })
    expect(await getTraktActivity(env, impl)).toMatchObject({ title: "A Movie", url: null })
  })

  it("makes no request when unconfigured", async () => {
    const { impl, calls } = fakeFetch({})
    expect(await getTraktActivity({ TRAKT_CLIENT_ID: "client" }, impl)).toBeNull()
    expect(calls).toHaveLength(0)
  })
})
