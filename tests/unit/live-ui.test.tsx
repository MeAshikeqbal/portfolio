import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { LiveLineView } from "@/components/home/live-line"
import { pickLiveLine, traktLabel } from "@/components/live/describe"
import { LivePanelView } from "@/components/live/live-panel"
import { formatRelative } from "@/lib/format"
import type { LiveActivity, SpotifyActivity, TraktActivity } from "@/lib/live/types"

const now = new Date("2026-11-09T12:00:00Z")
const spotify = (state: SpotifyActivity["state"], at: string | null = null): SpotifyActivity => ({
  state,
  track: "Song",
  artists: "Artist",
  url: "https://open.spotify.com/track/x",
  art: null,
  at,
  startedAt: null,
  endsAt: null,
})
const trakt = (state: TraktActivity["state"], at: string | null = null): TraktActivity => ({
  state,
  kind: "episode",
  title: "Pilot",
  show: "The Show",
  season: 1,
  episode: 2,
  year: 2022,
  url: "https://trakt.tv/shows/the-show/seasons/1/episodes/2",
  poster: null,
  at,
  startedAt: null,
  endsAt: null,
})
const jellyfin = (streams: number, transcode = 0) => ({
  streams,
  direct: streams - transcode,
  transcode,
  checkedAt: now.toISOString(),
})
const data = (partial: Partial<LiveActivity>): LiveActivity => ({
  spotify: null,
  trakt: null,
  jellyfin: null,
  ...partial,
})

describe("LivePanelView", () => {
  it("shows playing states in green with labels", () => {
    render(
      <LivePanelView
        now={now}
        data={data({
          spotify: spotify("playing"),
          trakt: trakt("watching"),
          jellyfin: jellyfin(3, 1),
        })}
      />,
    )
    expect(screen.getByText("listening")).toBeVisible()
    expect(screen.getByText("watching")).toBeVisible()
    expect(screen.getByText("streaming")).toBeVisible()
    expect(screen.getByText("3 people are watching on my Jellyfin")).toBeVisible()
    expect(screen.getByText("2 direct play · 1 transcoding")).toBeVisible()
    expect(screen.getByRole("link", { name: /The Show · S1E2/ })).toHaveAttribute(
      "href",
      "https://trakt.tv/shows/the-show/seasons/1/episodes/2",
    )
  })

  it("shows last-played states as idle with a relative time", () => {
    render(
      <LivePanelView
        now={now}
        data={data({
          spotify: spotify("last", "2026-11-09T10:00:00Z"),
          trakt: trakt("last", "2026-11-08T12:00:00Z"),
          jellyfin: jellyfin(0),
        })}
      />,
    )
    expect(screen.getByText("last played · 2h ago")).toBeVisible()
    expect(screen.getByText("last watched · 1d ago")).toBeVisible()
    expect(screen.getByText("idle")).toBeVisible()
    expect(screen.getByText("Nobody is watching on my Jellyfin")).toBeVisible()
  })

  it("leaves out integrations that returned nothing", () => {
    render(<LivePanelView now={now} data={data({ jellyfin: jellyfin(1) })} />)
    expect(screen.getAllByRole("listitem")).toHaveLength(1)
    expect(screen.getByText("1 person is watching on my Jellyfin")).toBeVisible()
  })
})

describe("pickLiveLine", () => {
  it("prefers playing, then watching, then streams, then the newest last item", () => {
    expect(
      pickLiveLine(data({ spotify: spotify("playing"), trakt: trakt("watching") })),
    ).toMatchObject({ verb: "listening to", status: "up" })
    expect(
      pickLiveLine(
        data({ spotify: spotify("last", "2026-11-09T10:00:00Z"), trakt: trakt("watching") }),
      ),
    ).toMatchObject({ verb: "watching" })
    expect(
      pickLiveLine(
        data({ spotify: spotify("last", "2026-11-09T10:00:00Z"), jellyfin: jellyfin(2) }),
      ),
    ).toMatchObject({ verb: "jellyfin", text: "2 streams right now" })
    expect(
      pickLiveLine(
        data({
          spotify: spotify("last", "2026-11-08T10:00:00Z"),
          trakt: trakt("last", "2026-11-09T10:00:00Z"),
          jellyfin: jellyfin(0),
        }),
      ),
    ).toMatchObject({ verb: "last watched", status: "idle" })
  })

  it("is null with nothing to show", () => {
    expect(pickLiveLine(null)).toBeNull()
    expect(pickLiveLine(undefined)).toBeNull()
    expect(pickLiveLine(data({ jellyfin: jellyfin(0) }))).toBeNull()
  })

  it("renders as a link to the /now panel", () => {
    render(<LiveLineView line={pickLiveLine(data({ spotify: spotify("playing") }))!} />)
    expect(screen.getByRole("link")).toHaveAttribute("href", "/now#live")
    // One sentence, not a label: "Listening to · Song · Artist".
    expect(screen.getByRole("link")).toHaveTextContent("Listening to · Song · Artist")
  })
})

describe("labels and times", () => {
  it("formats Trakt items and relative times", () => {
    expect(traktLabel(trakt("last"))).toBe("The Show · S1E2")
    expect(traktLabel({ ...trakt("last"), kind: "movie", title: "Dune", year: 2021 })).toBe(
      "Dune (2021)",
    )
    expect(formatRelative("2026-11-09T11:59:40Z", now)).toBe("just now")
    expect(formatRelative("2026-11-09T11:15:00Z", now)).toBe("45m ago")
    expect(formatRelative("2026-11-01T12:00:00Z", now)).toBe("8d ago")
    expect(formatRelative("2026-08-01T12:00:00Z", now)).toBe("Aug 1, 2026")
    expect(formatRelative("nope", now)).toBeNull()
  })
})

describe("Trakt posters", () => {
  it("shows the poster with TMDB's credit, and the icon without one", () => {
    const poster = "https://image.tmdb.org/t/p/w154/abc.jpg"
    const { container, rerender } = render(
      <LivePanelView
        data={data({ trakt: { ...trakt("last", now.toISOString()), poster } })}
        now={now}
      />,
    )
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      encodeURIComponent(poster),
    )
    expect(screen.getByRole("link", { name: "TMDB" })).toHaveAttribute(
      "href",
      "https://www.themoviedb.org/",
    )
    rerender(<LivePanelView data={data({ trakt: trakt("last", now.toISOString()) })} now={now} />)
    expect(container.querySelector("img")).toBeNull()
    expect(screen.queryByText(/TMDB/)).toBeNull()
  })
})
