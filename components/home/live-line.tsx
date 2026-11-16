"use client"

import { useTranslations } from "next-intl"
import { StatusDot } from "@/components/dashboard/status-dot"
import { pickLiveLine, type LiveLineContent } from "@/components/live/describe"
import { useLiveActivity } from "@/components/live/use-live-activity"
import { Link } from "@/i18n/navigation"

export function LiveLineView({ line }: { line: LiveLineContent }) {
  const t = useTranslations("live")
  const verb = t("verbs", { verb: line.verb })
  const text = line.text ?? t("streamsNow", { count: line.streams ?? 0 })
  return (
    <Link
      href="/now#live"
      // Inset outline: this sits inside the hero panel, whose overflow-hidden would clip it.
      className="flex items-center gap-2 border-b px-4 py-2.5 text-sm transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:-outline-offset-2"
    >
      <StatusDot
        status={line.status}
        pulse={line.status === "up"}
        label={line.status === "up" ? t("now") : t("earlier")}
      />
      {/* A sentence, not another label: "Jellyfin · 1 stream right now". */}
      <span className="min-w-0 truncate">
        <span className="font-medium">{verb.charAt(0).toLocaleUpperCase() + verb.slice(1)}</span>
        <span className="text-muted-foreground"> · {text}</span>
      </span>
    </Link>
  )
}

/** One line of live activity in the hero card, linking to the full panel on /now. */
export function LiveLine() {
  const line = pickLiveLine(useLiveActivity())
  return line ? <LiveLineView line={line} /> : null
}
