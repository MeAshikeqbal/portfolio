import { after, type NextRequest, NextResponse } from "next/server"
import { isCronAuthorized } from "@/lib/cron"
import { sendPush } from "@/lib/lab/alerts"
import type { Writeup } from "@/lib/lab/incidents"
import { buildMonthlyReport, isMonth, monthDays, previousMonth, reportPost } from "@/lib/lab/report"
import { readLabDays } from "@/lib/lab/store"
import { absoluteUrl, siteConfig } from "@/lib/site"
import { LAB_REPORT_QUERY } from "@/sanity/lib/queries"
import { writeClient } from "@/sanity/lib/write-client"

export const maxDuration = 30

/**
 * Drafts the monthly lab report: on the 1st (Vercel Cron, see vercel.json), a draft post about
 * the month before, from Homecave's uptime samples, incident log and changelog
 * (lib/lab/report.ts). It never publishes and never overwrites: if the month's report exists,
 * as a draft or published, it's left alone. A push to the owner's ntfy topic says it's ready.
 *
 *   GET /api/lab-report                  the previous month (what the cron runs)
 *   GET /api/lab-report?month=2026-11    another finished month
 *   GET /api/lab-report?dry=1            builds it and returns it, writes nothing
 */
async function draft(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const params = req.nextUrl.searchParams
  const now = new Date()
  const month = params.get("month") ?? previousMonth(now)
  if (!isMonth(month)) {
    return NextResponse.json({ message: "month must look like 2026-11" }, { status: 400 })
  }
  if (month >= now.toISOString().slice(0, 7)) {
    return NextResponse.json({ message: `${month} isn't over yet` }, { status: 400 })
  }
  const dry = params.has("dry")
  const id = `lab-report-${month}`
  const days = monthDays(month)

  const record = await readLabDays(days)
  if (!record) {
    return NextResponse.json({ message: "The lab's store isn't configured" }, { status: 503 })
  }
  const data = await writeClient.fetch(
    LAB_REPORT_QUERY,
    { from: days[0], to: days.at(-1)!, id, author: siteConfig.name },
    { perspective: "raw" },
  )
  if (data.existing && !dry) {
    return NextResponse.json({ message: "Already drafted", id: data.existing })
  }

  const report = buildMonthlyReport({
    month,
    record,
    changes: data.changes.flatMap((c) =>
      c.date && c.title ? [{ ...c, date: c.date, title: c.title }] : [],
    ),
    writeups: data.writeups.filter((w): w is Writeup => Boolean(w.title && w.slug && w.incident)),
  })
  if (report.coveredDays === 0 && report.incidents.length === 0 && report.changes.length === 0) {
    return NextResponse.json({ message: `Nothing was recorded in ${month}`, id: null })
  }

  const post = reportPost(report, now)
  const doc = {
    _id: `drafts.${id}`,
    _type: "post" as const,
    title: post.title,
    slug: { _type: "slug" as const, current: post.slug },
    ...(data.author && { author: { _type: "reference" as const, _ref: data.author } }),
    ...(data.category && {
      categories: [{ _type: "reference" as const, _ref: data.category, _key: "homelab" }],
    }),
    body: post.body,
  }
  if (dry) return NextResponse.json({ report, doc })

  // createIfNotExists: a draft started by hand in the meantime wins.
  await writeClient.createIfNotExists(doc)
  after(() =>
    sendPush({
      title: `${post.title} is drafted`,
      message: `${report.incidents.length} incidents, ${report.changes.length} changes. Edit it in the Studio, then publish.`,
      priority: 3,
      tags: ["memo"],
      click: absoluteUrl(`/studio/intent/edit/id=${id};type=post/`),
    }),
  )
  return NextResponse.json({ message: "Drafted", id: doc._id }, { status: 201 })
}

export const GET = draft
