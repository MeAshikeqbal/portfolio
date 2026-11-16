"use client"

import { Music, Server, Tv } from "lucide-react"
import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"
import type { ReactNode } from "react"
import { DataList, DataRow } from "@/components/dashboard/data-list"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { Skeleton } from "@/components/ui/skeleton"
import { formatRelative } from "@/lib/format"
import type {
  JellyfinActivity,
  LiveActivity,
  SpotifyActivity,
  TraktActivity,
} from "@/lib/live/types"
import { traktLabel } from "./describe"
import { PlaybackMeter, progressText, usePlaybackProgress } from "./playback-progress"
import { hasActivity, useLiveActivity } from "./use-live-activity"

// Greyscale like every other image in a row (colour means status only); a linked row brings
// its colour back on hover and focus.
const ART =
  "shrink-0 rounded-md object-cover ring-1 ring-border grayscale transition-[filter] duration-300 group-hover:grayscale-0 group-focus-visible:grayscale-0 motion-reduce:transition-none"

/** The row's leading plate: album art (square), a poster (2:3), or the source's icon. */
function Plate({
  art,
  poster,
  icon,
}: {
  art?: string | null
  poster?: string | null
  icon: ReactNode
}) {
  if (poster)
    return <Image src={poster} alt="" width={32} height={48} className={`h-12 w-8 ${ART}`} />
  if (art) return <Image src={art} alt="" width={32} height={32} className={`size-8 ${ART}`} />
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-icon-plate text-muted-foreground ring-1 ring-border [&_svg]:size-4">
      {icon}
    </span>
  )
}

/** "28m ago", or nothing without a time. */
const ago = (iso: string | null, now: Date | undefined, locale: string) =>
  iso ? formatRelative(iso, now, locale) : null

function SpotifyRow({ spotify, now }: { spotify: SpotifyActivity; now?: Date }) {
  const t = useTranslations("live")
  const locale = useLocale()
  const playing = spotify.state === "playing"
  const progress = usePlaybackProgress(spotify, now?.getTime())
  const when = playing ? (progress ? progressText(progress) : null) : ago(spotify.at, now, locale)
  return (
    <DataRow
      leading={<Plate art={spotify.art} icon={<Music />} />}
      title={spotify.track}
      href={spotify.url ?? undefined}
      description={spotify.artists}
      status={
        playing
          ? { status: "up", label: t("listening") }
          : { status: "idle", label: t("lastPlayed") }
      }
      meta={
        when
          ? [
              <span key="when" className="tabular">
                {when}
              </span>,
            ]
          : []
      }
      value={
        playing && progress ? (
          <PlaybackMeter progress={progress} label={t("trackProgress")} />
        ) : undefined
      }
    />
  )
}

function TraktRow({ trakt, now }: { trakt: TraktActivity; now?: Date }) {
  const t = useTranslations("live")
  const locale = useLocale()
  const watching = trakt.state === "watching"
  const progress = usePlaybackProgress(trakt, now?.getTime())
  const when = watching ? (progress ? progressText(progress) : null) : ago(trakt.at, now, locale)
  const label = trakt.kind === "movie" ? t("movieProgress") : t("episodeProgress")
  return (
    <DataRow
      leading={<Plate poster={trakt.poster} icon={<Tv />} />}
      title={traktLabel(trakt)}
      href={trakt.url ?? undefined}
      description={trakt.kind === "episode" && trakt.title !== trakt.show ? trakt.title : undefined}
      status={
        watching
          ? { status: "up", label: t("watching") }
          : { status: "idle", label: t("lastWatched") }
      }
      meta={
        when
          ? [
              <span key="when" className="tabular">
                {when}
              </span>,
            ]
          : []
      }
      value={watching && progress ? <PlaybackMeter progress={progress} label={label} /> : undefined}
    />
  )
}

/** Counts only: who is watching what on the Jellyfin server stays private. */
function JellyfinRow({ jellyfin }: { jellyfin: JellyfinActivity }) {
  const t = useTranslations("live")
  const { streams, direct, transcode } = jellyfin
  return (
    <DataRow
      leading={<Plate icon={<Server />} />}
      title={streams === 0 ? t("jellyfinNothing") : t("jellyfinStreams", { count: streams })}
      status={
        streams > 0 ? { status: "up", label: t("streaming") } : { status: "idle", label: t("idle") }
      }
      meta={
        streams > 0
          ? [
              <span key="direct" className="tabular">
                {t("direct", { count: direct })}
              </span>,
              <span key="transcode" className="tabular">
                {t("transcoding", { count: transcode })}
              </span>,
            ]
          : []
      }
    />
  )
}

/** The live rows; integrations that returned null are left out. */
export function LivePanelView({ data, now }: { data: LiveActivity; now?: Date }) {
  const t = useTranslations("live")
  const { spotify, trakt, jellyfin } = data
  return (
    <Panel>
      <PanelHeader
        title={
          <h2 id="now-live" className="text-foreground">
            {t("title")}
          </h2>
        }
        meta={<span>{t("updates")}</span>}
      />
      <DataList>
        {spotify && <SpotifyRow spotify={spotify} now={now} />}
        {trakt && <TraktRow trakt={trakt} now={now} />}
        {jellyfin && <JellyfinRow jellyfin={jellyfin} />}
      </DataList>
      {trakt?.poster && (
        // TMDB's terms: credit it wherever its images appear.
        <p className="border-t px-4 py-2 text-xs text-pretty text-muted-foreground">
          {t.rich("tmdbCredit", {
            link: (chunks) => (
              <a
                href="https://www.themoviedb.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-border underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      )}
    </Panel>
  )
}

/** Live activity on /now. Hidden entirely when nothing is configured or the API fails. */
export function LivePanel() {
  const t = useTranslations("live")
  const data = useLiveActivity()
  if (data === undefined) {
    // The panel's own frame while the first answer is out, so nothing jumps when it lands.
    return (
      <Panel aria-busy="true" aria-label={t("loading")}>
        <PanelHeader title={t("title")} meta={<span>{t("updates")}</span>} />
        <div className="divide-y">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-8 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    )
  }
  if (!hasActivity(data)) return null
  return <LivePanelView data={data} />
}
