import type { TypedObject } from "@portabletext/types"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import {
  playableKind,
  sanityFileUrl,
  videoMimeType,
  youtubeEmbedUrl,
  youtubeId,
  youtubeStart,
  type VideoValue,
} from "@/lib/video"

vi.mock("@/sanity/lib/image", () => ({
  urlFor: () => ({
    width: () => ({
      fit: () => ({ auto: () => ({ url: () => "https://cdn.sanity.io/poster.jpg" }) }),
    }),
  }),
}))

const { VideoFigure } = await import("@/components/media/video-figure")
const { portableTextToFeedHtml } = await import("@/lib/feed-html")

const ID = "dQw4w9WgXcQ"

describe("youtubeId", () => {
  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}?t=10`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `https://www.youtube.com/live/${ID}`,
    `https://music.youtube.com/watch?v=${ID}`,
  ])("reads %s", (url) => expect(youtubeId(url)).toBe(ID))

  it.each([
    "https://vimeo.com/123",
    "https://www.youtube.com/watch?v=short",
    "https://www.youtube.com/@channel",
    "https://evil.example/watch?v=dQw4w9WgXcQ",
    "javascript:alert(1)",
    "not a url",
    "",
    null,
  ])("rejects %s", (url) => expect(youtubeId(url)).toBeNull())
})

describe("youtubeStart", () => {
  it("reads seconds and h/m/s forms", () => {
    expect(youtubeStart(`https://youtu.be/${ID}?t=90`)).toBe(90)
    expect(youtubeStart(`https://youtu.be/${ID}?t=1m30s`)).toBe(90)
    expect(youtubeStart(`https://youtu.be/${ID}?t=1h2m3s`)).toBe(3723)
    expect(youtubeStart(`https://youtu.be/${ID}`)).toBeNull()
    expect(youtubeStart(`https://youtu.be/${ID}?t=abc`)).toBeNull()
  })

  it("puts the start time on the nocookie embed", () => {
    expect(youtubeEmbedUrl(ID, 90)).toBe(
      `https://www.youtube-nocookie.com/embed/${ID}?autoplay=1&rel=0&modestbranding=1&start=90`,
    )
  })
})

describe("uploaded files", () => {
  const project = { projectId: "p1", dataset: "production" }

  it("builds the CDN URL and type from the asset reference", () => {
    expect(sanityFileUrl("file-abc123-mp4", project)).toBe(
      "https://cdn.sanity.io/files/p1/production/abc123.mp4",
    )
    expect(videoMimeType("file-abc123-mp4")).toBe("video/mp4")
    expect(videoMimeType("file-abc123-webm")).toBe("video/webm")
  })

  it("rejects malformed references", () => {
    expect(sanityFileUrl("image-abc-10x10-png", project)).toBeNull()
    expect(sanityFileUrl("file-../../x-mp4", project)).toBeNull()
    expect(sanityFileUrl(undefined, project)).toBeNull()
  })
})

describe("playableKind", () => {
  it("needs a file for uploads and a valid link for YouTube", () => {
    expect(playableKind({ kind: "upload", file: { asset: { _ref: "file-a1-mp4" } } })).toBe(
      "upload",
    )
    expect(playableKind({ kind: "upload" })).toBeNull()
    expect(playableKind({ kind: "youtube", youtubeUrl: `https://youtu.be/${ID}` })).toBe("youtube")
    expect(playableKind({ kind: "youtube", youtubeUrl: "https://vimeo.com/1" })).toBeNull()
    expect(playableKind(null)).toBeNull()
  })
})

describe("VideoFigure", () => {
  it("shows a YouTube thumbnail and loads the nocookie player only on click", () => {
    const { container } = render(
      <VideoFigure
        value={{
          kind: "youtube",
          youtubeUrl: `https://youtu.be/${ID}`,
          title: "Demo",
          caption: "A tour",
        }}
      />,
    )
    expect(container.querySelector("iframe")).toBeNull()
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`,
    )
    expect(screen.getByText("A tour")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Play video: Demo" }))
    const frame = container.querySelector("iframe")!
    expect(frame.getAttribute("src")).toContain(`https://www.youtube-nocookie.com/embed/${ID}`)
    expect(frame.getAttribute("title")).toBe("Demo")
  })

  it("renders an uploaded clip with controls from the Sanity CDN", () => {
    const { container } = render(
      <VideoFigure
        value={{ kind: "upload", file: { asset: { _ref: "file-abc123-webm" } }, title: "Clip" }}
      />,
    )
    const video = container.querySelector("video")!
    expect(video.hasAttribute("controls")).toBe(true)
    expect(video.getAttribute("aria-label")).toBe("Clip")
    const source = container.querySelector("source")!
    expect(source.getAttribute("src")).toBe("https://cdn.sanity.io/files/test/test/abc123.webm")
    expect(source.getAttribute("type")).toBe("video/webm")
  })

  it("plays a GIF-style clip muted with a pause button, and skips autoplay for reduced motion", () => {
    const play = vi.fn(() => Promise.resolve())
    window.HTMLMediaElement.prototype.play = play
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as never
    const { container } = render(
      <VideoFigure
        value={{
          kind: "upload",
          file: { asset: { _ref: "file-abc123-mp4" } },
          title: "Loop",
          loop: true,
        }}
      />,
    )
    const video = container.querySelector("video")!
    expect(video.muted).toBe(true)
    expect(video.hasAttribute("loop")).toBe(true)
    expect(video.hasAttribute("controls")).toBe(false)
    expect(play).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Play: Loop" })).toBeTruthy()
  })

  it("renders nothing without a playable source", () => {
    const { container } = render(<VideoFigure value={{ kind: "upload", title: "Empty" }} />)
    expect(container.innerHTML).toBe("")
  })
})

describe("feed", () => {
  it("links to videos instead of embedding them", () => {
    const blocks: VideoValue[] = [
      {
        _type: "video",
        _key: "a",
        kind: "youtube",
        youtubeUrl: `https://youtu.be/${ID}`,
        title: "Tour",
      },
      {
        _type: "video",
        _key: "b",
        kind: "upload",
        file: { asset: { _ref: "file-abc-mp4" } },
        title: "Clip",
      },
      { _type: "video", _key: "c", kind: "upload", title: "Empty" },
    ]
    const html = portableTextToFeedHtml(blocks as TypedObject[])
    expect(html).toContain(`<a href="https://www.youtube.com/watch?v=${ID}">Video: Tour</a>`)
    expect(html).toContain(
      '<a href="https://cdn.sanity.io/files/test/test/abc.mp4">Video: Clip</a>',
    )
    expect(html).not.toContain("Empty")
  })
})
