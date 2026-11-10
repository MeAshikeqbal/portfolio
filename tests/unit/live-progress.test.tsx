import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { pickNowPlaying } from "@/components/live/describe"
import { LivePanelView } from "@/components/live/live-panel"
import { NowPlayingBarItemView } from "@/components/live/now-playing-bar-item"
import {
  LIVE_POLL_MS,
  resetLiveActivityStore,
  useLiveActivity,
} from "@/components/live/use-live-activity"
import { formatDuration, NO_TIMING, progressAt, timing } from "@/lib/live/progress"
import { getSpotifyActivity, resetSpotifyTokenCache, spotifyTiming } from "@/lib/live/spotify"
import { getTraktActivity } from "@/lib/live/trakt"
import type { LiveActivity, SpotifyActivity, TraktActivity } from "@/lib/live/types"
import { fakeFetch, json, spotifyTrack } from "./live-fixtures"

const T0 = Date.parse("2026-11-11T12:00:00Z")
const iso = (ms: number) => new Date(ms).toISOString()

describe("progress math", () => {
  it("builds a span only from a real start before a real end", () => {
    expect(timing(T0, T0 + 1000)).toEqual({ startedAt: iso(T0), endsAt: iso(T0 + 1000) })
    expect(timing(T0, T0)).toEqual(NO_TIMING)
    expect(timing(T0, T0 - 1)).toEqual(NO_TIMING)
    expect(timing(null, T0)).toEqual(NO_TIMING)
    expect(timing(NaN, T0)).toEqual(NO_TIMING)
  })

  it("clamps progress to the span", () => {
    const t = timing(T0, T0 + 200_000)
    expect(progressAt(t, T0 + 50_000)).toEqual({
      fraction: 0.25,
      elapsedMs: 50_000,
      totalMs: 200_000,
    })
    expect(progressAt(t, T0 - 5000)?.fraction).toBe(0)
    expect(progressAt(t, T0 + 999_999)?.fraction).toBe(1)
    expect(progressAt(NO_TIMING, T0)).toBeNull()
    expect(progressAt({ startedAt: "garbage", endsAt: iso(T0) }, T0)).toBeNull()
  })

  it("formats durations like a player", () => {
    expect(formatDuration(0)).toBe("0:00")
    expect(formatDuration(151_900)).toBe("2:31")
    expect(formatDuration(3_729_000)).toBe("1:02:09")
    expect(formatDuration(-5)).toBe("0:00")
  })
})

describe("Spotify timing", () => {
  beforeEach(() => resetSpotifyTokenCache())
  afterEach(() => vi.useRealTimers())

  it("works back from progress to absolute start and end", () => {
    expect(spotifyTiming(30_000, 200_000, T0)).toEqual({
      startedAt: iso(T0 - 30_000),
      endsAt: iso(T0 + 170_000),
    })
    expect(spotifyTiming(300_000, 200_000, T0)).toEqual(NO_TIMING)
    expect(spotifyTiming(-1, 200_000, T0)).toEqual(NO_TIMING)
    expect(spotifyTiming("30", 200_000, T0)).toEqual(NO_TIMING)
    expect(spotifyTiming(30_000, undefined, T0)).toEqual(NO_TIMING)
  })

  it("carries the span on a playing track, and not on a paused one", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(T0)
    const env = { SPOTIFY_CLIENT_ID: "i", SPOTIFY_CLIENT_SECRET: "s", SPOTIFY_REFRESH_TOKEN: "r" }
    const answer = (playing: boolean) =>
      fakeFetch({
        "POST accounts.spotify.com": () => json({ access_token: "a", expires_in: 3600 }),
        "GET api.spotify.com/v1/me/player/currently-playing": () =>
          json({
            is_playing: playing,
            progress_ms: 60_000,
            timestamp: T0,
            currently_playing_type: "track",
            item: { ...spotifyTrack("Song"), duration_ms: 180_000 },
          }),
      }).impl
    expect(await getSpotifyActivity(env, answer(true))).toMatchObject({
      state: "playing",
      startedAt: iso(T0 - 60_000),
      endsAt: iso(T0 + 120_000),
    })
    expect(await getSpotifyActivity(env, answer(false))).toMatchObject({
      state: "last",
      startedAt: null,
      endsAt: null,
    })
  })
})

describe("Trakt timing", () => {
  const env = { TRAKT_CLIENT_ID: "client", TRAKT_USERNAME: "someone" }
  const watching = {
    type: "episode",
    started_at: "2026-11-11T11:40:00.000Z",
    expires_at: "2026-11-11T12:22:00.000Z",
    show: { title: "The Mentalist", year: 2008, ids: { slug: "the-mentalist" } },
    episode: { title: "The Red Mile", season: 3, number: 18 },
  }

  it("uses Trakt's own start and expiry while watching", async () => {
    const { impl } = fakeFetch({ "GET api.trakt.tv/users/someone/watching": () => json(watching) })
    expect(await getTraktActivity(env, impl)).toMatchObject({
      state: "watching",
      startedAt: "2026-11-11T11:40:00.000Z",
      endsAt: "2026-11-11T12:22:00.000Z",
    })
  })

  it("drops a span that ends before it starts", async () => {
    const { impl } = fakeFetch({
      "GET api.trakt.tv/users/someone/watching": () =>
        json({ ...watching, expires_at: "2026-11-11T11:00:00.000Z" }),
    })
    expect(await getTraktActivity(env, impl)).toMatchObject({ startedAt: null, endsAt: null })
  })
})

const span = timing(T0 - 60_000, T0 + 120_000)
const spotify = (state: SpotifyActivity["state"], extra: Partial<SpotifyActivity> = {}) =>
  ({
    state,
    track: "blue",
    artists: "yung kai",
    url: null,
    art: null,
    at: state === "last" ? iso(T0 - 600_000) : null,
    ...(state === "playing" ? span : NO_TIMING),
    ...extra,
  }) satisfies SpotifyActivity
const trakt = (state: TraktActivity["state"]) =>
  ({
    state,
    kind: "episode",
    title: "The Red Mile",
    show: "The Mentalist",
    season: 3,
    episode: 18,
    year: 2008,
    url: null,
    poster: null,
    at: state === "last" ? iso(T0 - 600_000) : null,
    ...(state === "watching" ? span : NO_TIMING),
  }) satisfies TraktActivity
const data = (partial: Partial<LiveActivity>): LiveActivity => ({
  spotify: null,
  trakt: null,
  jellyfin: null,
  ...partial,
})

describe("pickNowPlaying", () => {
  it("only reports live states, listening first like the hero", () => {
    expect(pickNowPlaying(undefined)).toBeNull()
    expect(pickNowPlaying(data({ spotify: spotify("last"), trakt: trakt("last") }))).toBeNull()
    expect(
      pickNowPlaying(data({ spotify: spotify("playing"), trakt: trakt("watching") })),
    ).toMatchObject({ kind: "listening", text: "blue — yung kai", ...span })
    expect(
      pickNowPlaying(data({ spotify: spotify("last"), trakt: trakt("watching") })),
    ).toMatchObject({ kind: "watching", text: "The Mentalist · S3E18" })
    expect(pickNowPlaying(data({ spotify: spotify("playing", { artists: "" }) }))?.text).toBe(
      "blue",
    )
  })
})

describe("NowPlayingBarItemView", () => {
  it("links to the live panel, named once, with progress in its title", () => {
    const item = pickNowPlaying(data({ spotify: spotify("playing") }))!
    render(<NowPlayingBarItemView item={item} now={T0} />)
    const link = screen.getByRole("link", { name: "Listening to blue — yung kai" })
    expect(link).toHaveAttribute("href", "/now#live")
    expect(link).toHaveAttribute("title", "1:00 / 3:00")
    // Fits (jsdom lays nothing out), so there's a single copy and no marquee.
    expect(link.querySelector(".marquee-track")).toBeNull()
    expect(screen.getAllByText("blue — yung kai")).toHaveLength(1)
  })

  it("draws no progress without a span", () => {
    const item = pickNowPlaying(data({ trakt: { ...trakt("watching"), ...NO_TIMING } }))!
    render(<NowPlayingBarItemView item={item} now={T0} />)
    const link = screen.getByRole("link", { name: "Watching The Mentalist · S3E18" })
    expect(link).not.toHaveAttribute("title")
    expect(link.querySelector("[aria-hidden] > span[style]")).toBeNull()
  })
})

describe("playback progress on /now", () => {
  it("is the neutral meter, announced as a progress bar, with elapsed / total beside it", () => {
    render(
      <LivePanelView data={data({ spotify: spotify("playing") })} now={new Date(T0 + 30_000)} />,
    )
    const bar = screen.getByRole("progressbar", { name: "Track progress" })
    expect(bar).toHaveAttribute("aria-valuenow", "90000")
    expect(bar).toHaveAttribute("aria-valuemax", "180000")
    expect(bar).toHaveAttribute("aria-valuetext", "1:30 of 3:00")
    expect(screen.getAllByText("1:30 / 3:00")[0]).toBeVisible()
  })

  it("draws no bar and prints no time without a span", () => {
    render(
      <LivePanelView data={data({ spotify: spotify("playing", NO_TIMING) })} now={new Date(T0)} />,
    )
    expect(screen.queryByRole("progressbar")).toBeNull()
    expect(screen.queryByText(/\d:\d\d \/ /)).toBeNull()
    expect(screen.getAllByText("listening")[0]).toBeVisible()
  })

  it("appears on playing rows of the /now panel only", () => {
    const now = new Date(T0)
    const { rerender } = render(
      <LivePanelView
        data={data({ spotify: spotify("playing"), trakt: trakt("watching") })}
        now={now}
      />,
    )
    expect(screen.getByRole("progressbar", { name: "Track progress" })).toBeVisible()
    expect(screen.getByRole("progressbar", { name: "Episode progress" })).toBeVisible()
    rerender(
      <LivePanelView data={data({ spotify: spotify("last"), trakt: trakt("last") })} now={now} />,
    )
    expect(screen.queryByRole("progressbar")).toBeNull()
  })
})

describe("shared live poll", () => {
  function Probe({ id }: { id: string }) {
    const live = useLiveActivity()
    return (
      <p data-testid={id}>{live === undefined ? "pending" : (live?.spotify?.track ?? "none")}</p>
    )
  }

  beforeEach(() => {
    resetLiveActivityStore()
    vi.useFakeTimers()
    vi.setSystemTime(T0)
  })
  afterEach(() => {
    resetLiveActivityStore()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("makes one request for every consumer on the page, then polls once a minute", async () => {
    const fetchMock = vi.fn(async () => Response.json(data({ spotify: spotify("last") })))
    vi.stubGlobal("fetch", fetchMock)
    render(
      <>
        <Probe id="bar" />
        <Probe id="hero" />
        <Probe id="panel" />
      </>,
    )
    await act(async () => {})
    expect(fetchMock).toHaveBeenCalledTimes(1)
    for (const id of ["bar", "hero", "panel"])
      expect(screen.getByTestId(id)).toHaveTextContent("blue")
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIVE_POLL_MS)
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("looks again shortly after the current track should end", async () => {
    // 20s left on the track: look again 5s after it ends, well before the next poll.
    const short = timing(T0 - 150_000, T0 + 20_000)
    const fetchMock = vi.fn(async () => Response.json(data({ spotify: spotify("playing", short) })))
    vi.stubGlobal("fetch", fetchMock)
    render(<Probe id="bar" />)
    await act(async () => {})
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(25_000)
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("stops polling when the last consumer leaves", async () => {
    const fetchMock = vi.fn(async () => Response.json(data({})))
    vi.stubGlobal("fetch", fetchMock)
    const { unmount } = render(<Probe id="bar" />)
    await act(async () => {})
    unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIVE_POLL_MS * 3)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
