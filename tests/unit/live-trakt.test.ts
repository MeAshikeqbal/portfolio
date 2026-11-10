import { afterEach, describe, expect, it } from "vitest"
import { clearPosterCache, getTmdbPoster } from "@/lib/live/tmdb"
import { getTraktActivity, tmdbRef } from "@/lib/live/trakt"
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
      poster: null,
      at: null,
      // No started_at/expires_at in this entry, so no bar.
      startedAt: null,
      endsAt: null,
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

describe("posters from TMDB", () => {
  afterEach(() => clearPosterCache())
  const TMDB = "GET api.themoviedb.org/3/"
  const withTmdb = { ...env, TMDB_API_KEY: "0123456789abcdef0123456789abcdef" }

  it("looks up the show's poster for an episode, and the movie's for a movie", async () => {
    expect(
      tmdbRef({ ...episode, show: { ...episode.show, ids: { slug: "x", tmdb: 1414 } } }),
    ).toEqual({
      kind: "tv",
      id: 1414,
    })
    expect(tmdbRef({ ...movie, movie: { ...movie.movie, ids: { tmdb: 27205 } } })).toEqual({
      kind: "movie",
      id: 27205,
    })
    expect(
      tmdbRef({ ...movie, movie: { ...movie.movie, ids: { tmdb: "27205; drop" } } }),
    ).toBeNull()

    const { impl, calls } = fakeFetch({
      [WATCHING]: () =>
        json({ ...episode, show: { ...episode.show, ids: { slug: "the-show", tmdb: 1414 } } }),
      [TMDB]: () => json({ poster_path: "/abc123.jpg", name: "ignored" }),
    })
    expect(await getTraktActivity(withTmdb, impl)).toMatchObject({
      title: "Pilot",
      poster: "https://image.tmdb.org/t/p/w154/abc123.jpg",
    })
    const tmdbCall = new URL(calls[1].url)
    expect(tmdbCall.pathname).toBe("/3/tv/1414")
    expect(tmdbCall.searchParams.get("api_key")).toBe(withTmdb.TMDB_API_KEY)
  })

  it("sends a read access token as a bearer header instead", async () => {
    const { impl, calls } = fakeFetch({ [TMDB]: () => json({ poster_path: "/p.png" }) })
    const token = "eyJhbGciOiJIUzI1NiJ9.e30.sig"
    expect(await getTmdbPoster("movie", 1, { TMDB_API_KEY: token }, impl)).toBe(
      "https://image.tmdb.org/t/p/w154/p.png",
    )
    expect(new URL(calls[0].url).searchParams.has("api_key")).toBe(false)
    expect(calls[0].init?.headers).toMatchObject({ authorization: `Bearer ${token}` })
  })

  it("caches answers for a day, but retries failures and bad keys", async () => {
    let answer: () => Response = () => json({ poster_path: "/a.jpg" })
    const { impl, calls } = fakeFetch({ [TMDB]: () => answer() })
    const key = { TMDB_API_KEY: "k" }
    await getTmdbPoster("tv", 7, key, impl, 0)
    await getTmdbPoster("tv", 7, key, impl, 1000)
    expect(calls).toHaveLength(1)
    await getTmdbPoster("tv", 7, key, impl, 86_400_001)
    expect(calls).toHaveLength(2)

    answer = () => empty(401)
    expect(await getTmdbPoster("tv", 8, key, impl)).toBeNull()
    expect(await getTmdbPoster("tv", 8, key, impl)).toBeNull()
    expect(calls).toHaveLength(4)
  })

  it("never passes through an unexpected image path, and needs a key", async () => {
    const { impl } = fakeFetch({
      [TMDB]: () => json({ poster_path: "https://evil.example/x.jpg" }),
    })
    expect(await getTmdbPoster("tv", 9, { TMDB_API_KEY: "k" }, impl)).toBeNull()
    expect(await getTmdbPoster("tv", 9, {}, impl)).toBeNull()
  })

  it("leaves the activity alone without a key", async () => {
    const { impl, calls } = fakeFetch({
      [WATCHING]: () => json({ ...movie, movie: { ...movie.movie, ids: { tmdb: 27205 } } }),
    })
    expect(await getTraktActivity(env, impl)).toMatchObject({ title: "A Movie", poster: null })
    expect(calls).toHaveLength(1)
  })
})
