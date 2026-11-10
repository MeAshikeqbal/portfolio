"use client"

import { ArrowUpRight, Music, Server, Tv } from "lucide-react"
import Image from "next/image"
import type { ReactNode } from "react"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { StatusPill } from "@/components/dashboard/status-pill"
import { Skeleton } from "@/components/ui/skeleton"
import { formatRelative } from "@/lib/format"
import type { LiveActivity } from "@/lib/live/types"
import { traktLabel } from "./describe"
import { hasActivity, useLiveActivity } from "./use-live-activity"

function Row({
  icon,
  pill,
  title,
  href,
  detail,
  art,
  poster,
}: {
  icon: ReactNode
  pill: ReactNode
  title: string
  href?: string | null
  detail?: string | null
  /** Square artwork (album covers). */
  art?: string | null
  /** A 2:3 poster (movies and shows), same width as the artwork. */
  poster?: string | null
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      {poster ? (
        <Image
          src={poster}
          alt=""
          width={40}
          height={60}
          className="h-15 w-10 shrink-0 rounded object-cover ring-1 ring-border"
        />
      ) : art ? (
        <Image src={art} alt="" width={40} height={40} className="size-10 shrink-0 rounded" />
      ) : (
        <span className="grid size-10 shrink-0 place-items-center rounded bg-surface-2 text-muted-foreground [&_svg]:size-4.5">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="mb-0.5">{pill}</div>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1 font-medium hover:underline"
          >
            <span className="truncate">{title}</span>
            <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          </a>
        ) : (
          <p className="truncate font-medium">{title}</p>
        )}
        {detail && <p className="truncate text-sm text-muted-foreground">{detail}</p>}
      </div>
    </li>
  )
}

/** The live rows; integrations that returned null are left out. */
export function LivePanelView({ data, now = new Date() }: { data: LiveActivity; now?: Date }) {
  const { spotify, trakt, jellyfin } = data
  return (
    <Panel>
      <PanelHeader title="live" meta={<span>updates every minute</span>} />
      <ul className="divide-y">
        {spotify && (
          <Row
            icon={<Music />}
            art={spotify.art}
            pill={
              spotify.state === "playing" ? (
                <StatusPill status="up" pulse>
                  listening
                </StatusPill>
              ) : (
                <StatusPill status="idle">
                  last played{spotify.at ? ` · ${formatRelative(spotify.at, now)}` : ""}
                </StatusPill>
              )
            }
            title={spotify.track}
            href={spotify.url}
            detail={spotify.artists}
          />
        )}
        {trakt && (
          <Row
            icon={<Tv />}
            poster={trakt.poster}
            pill={
              trakt.state === "watching" ? (
                <StatusPill status="up" pulse>
                  watching
                </StatusPill>
              ) : (
                <StatusPill status="idle">
                  last watched{trakt.at ? ` · ${formatRelative(trakt.at, now)}` : ""}
                </StatusPill>
              )
            }
            title={traktLabel(trakt)}
            href={trakt.url}
            detail={trakt.kind === "episode" && trakt.title !== trakt.show ? trakt.title : null}
          />
        )}
        {jellyfin && (
          <Row
            icon={<Server />}
            pill={
              jellyfin.streams > 0 ? (
                <StatusPill status="up">streaming</StatusPill>
              ) : (
                <StatusPill status="idle">idle</StatusPill>
              )
            }
            title={
              jellyfin.streams === 0
                ? "Nobody is watching on my Jellyfin"
                : `${jellyfin.streams} ${jellyfin.streams === 1 ? "person is" : "people are"} watching on my Jellyfin`
            }
            detail={
              jellyfin.streams > 0
                ? `${jellyfin.direct} direct play · ${jellyfin.transcode} transcoding`
                : null
            }
          />
        )}
      </ul>
      {trakt?.poster && (
        // TMDB's terms: credit it wherever its images appear.
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">
          Poster from{" "}
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            TMDB
          </a>
          . This site uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      )}
    </Panel>
  )
}

/** Live activity on /now. Hidden entirely when nothing is configured or the API fails. */
export function LivePanel() {
  const data = useLiveActivity()
  if (data === undefined) {
    return (
      <div aria-busy="true" aria-label="Loading live activity" className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }
  if (!hasActivity(data)) return null
  return <LivePanelView data={data} />
}
