import { useTranslations } from "next-intl"
import { dataset, projectId } from "@/sanity/env"
import { urlFor } from "@/sanity/lib/image"
import {
  playableKind,
  sanityFileUrl,
  videoMimeType,
  youtubeEmbedUrl,
  youtubeId,
  youtubeStart,
  youtubeThumbnail,
  type VideoValue,
} from "@/lib/video"
import { cn } from "@/lib/utils"
import { UploadedVideo, YouTubeEmbed } from "./video-player"

function posterUrl(value: VideoValue): string | undefined {
  if (!value.poster?.asset?._ref) return undefined
  try {
    return urlFor(value.poster).width(1600).fit("max").auto("format").url()
  } catch {
    return undefined
  }
}

/**
 * A Sanity `video` (upload or YouTube) with its caption. Renders nothing when there's nothing
 * playable, e.g. a block saved without a file.
 */
export function VideoFigure({
  value,
  className,
  captionClassName,
}: {
  value: VideoValue | null | undefined
  className?: string
  captionClassName?: string
}) {
  const t = useTranslations("ui")
  const kind = playableKind(value)
  if (!value || !kind) return null
  const title = value.title || t("video")
  const poster = posterUrl(value)

  let player: React.ReactNode = null
  if (kind === "youtube") {
    const id = youtubeId(value.youtubeUrl)!
    player = (
      <YouTubeEmbed
        embedUrl={youtubeEmbedUrl(id, youtubeStart(value.youtubeUrl))}
        thumbnail={poster ?? youtubeThumbnail(id)}
        title={title}
      />
    )
  } else {
    const ref = value.file?.asset?._ref
    const src = sanityFileUrl(ref, { projectId, dataset })
    if (!src) return null
    player = (
      <UploadedVideo
        src={src}
        type={videoMimeType(ref)}
        title={title}
        poster={poster}
        loop={Boolean(value.loop)}
      />
    )
  }

  return (
    <figure className={cn("not-prose", className)}>
      {player}
      {value.caption && (
        <figcaption className={cn("mt-2 text-sm text-muted-foreground", captionClassName)}>
          {value.caption}
        </figcaption>
      )}
    </figure>
  )
}
