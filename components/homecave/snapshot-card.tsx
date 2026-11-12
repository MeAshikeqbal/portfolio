import type { ReactNode } from "react"
import { sparklinePoints } from "@/components/dashboard/sparkline"
import type { LabSnapshot, SnapshotNode, SnapshotPool } from "@/lib/lab/snapshot"
import { Bar, Dot, Mono, OG_COLORS, truncate } from "@/lib/og"
import { siteConfig } from "@/lib/site"
import type { Status } from "@/lib/status"

/**
 * The Homecave snapshot: a picture of the lab at one moment, rendered by Satori for
 * `/homecave/snapshot`. Flexbox and inline hex colours only (Satori has no grid or CSS
 * variables). The colours are the dark theme's; green only ever means a measured "up".
 */

export const SNAPSHOT_WIDTH = 1200

/** Dots and bars use the status colour; text uses its lighter "fg" step, as on the site. */
const DOT: Record<Status, string> = {
  up: OG_COLORS.up,
  warn: OG_COLORS.warn,
  down: OG_COLORS.down,
  info: OG_COLORS.info,
  idle: OG_COLORS.idle,
}
const TEXT: Record<Status, string> = {
  up: "#75df8f",
  warn: "#fbc959",
  down: "#ff9890",
  info: OG_COLORS.info,
  idle: OG_COLORS.muted,
}
const BORDER_STRONG = "#37373c"

// Fixed heights, so the image is exactly as tall as its content.
const BARS = 72 * 2
const PAD_Y = 40
/** Matches the bars' 72px inset, so every left edge lines up. */
const PAD_X = 72
const HEAD = 116
const GAP = 28
const NODE_CARD = 392
const NODE_GAP = 20
const NODES_PER_ROW = 3
const STORAGE_HEAD = 40
const STORAGE_ROW = 46
const EMPTY_BODY = 116

/** The image height for a snapshot (or the "hasn't reported" card when null). */
export function snapshotHeight(snapshot: LabSnapshot | null): number {
  if (!snapshot) return BARS + PAD_Y * 2 + EMPTY_BODY
  const rows = Math.max(1, Math.ceil(snapshot.nodes.length / NODES_PER_ROW))
  const storage =
    snapshot.pools.length > 0 ? GAP + STORAGE_HEAD + snapshot.pools.length * STORAGE_ROW : 0
  return BARS + PAD_Y * 2 + HEAD + GAP + rows * NODE_CARD + (rows - 1) * NODE_GAP + storage
}

export function SnapshotCard({
  snapshot,
  takenAt,
}: {
  snapshot: LabSnapshot | null
  takenAt: string
}) {
  const summary = snapshot?.summary

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: OG_COLORS.background,
        color: OG_COLORS.foreground,
        fontFamily: "Geist",
      }}
    >
      <Bar>
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Satori lays out fragments' children loosely: dot and label are plain siblings. */}
          {summary && <Dot color={DOT[summary.status]} />}
          <span style={{ color: summary ? TEXT[summary.status] : OG_COLORS.muted }}>
            {summary?.label ?? "no data"}
          </span>
        </span>
        <span>itsashik.dev/homecave</span>
      </Bar>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: `${PAD_Y}px ${PAD_X}px`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", height: HEAD }}>
          <Mono size={20} color={OG_COLORS.muted}>
            homecave · snapshot
          </Mono>
          {snapshot ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  marginTop: 14,
                  fontSize: 36,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              >
                {snapshot.verdict.map((item, i) => (
                  <span key={item.key} style={{ display: "flex" }}>
                    <span style={{ color: item.status ? TEXT[item.status] : OG_COLORS.foreground }}>
                      {item.text}
                    </span>
                    {i < snapshot.verdict.length - 1 && (
                      <span style={{ color: OG_COLORS.muted, margin: "0 16px" }}>·</span>
                    )}
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", marginTop: 12 }}>
                <Mono size={17} color={OG_COLORS.muted}>
                  {snapshot.freshness}
                </Mono>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                marginTop: 14,
                fontSize: 40,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: OG_COLORS.muted,
              }}
            >
              the lab hasn&apos;t reported yet
            </div>
          )}
        </div>

        {snapshot && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: NODE_GAP,
              marginTop: GAP,
            }}
          >
            {snapshot.nodes.map((node) => (
              <NodeCard key={node.name} node={node} />
            ))}
          </div>
        )}

        {snapshot && snapshot.pools.length > 0 && <Storage pools={snapshot.pools} />}
      </div>

      <Bar bottom>
        <span>snapshot · {takenAt}</span>
        <span>{siteConfig.name}</span>
      </Bar>
    </div>
  )
}

const CARD_WIDTH = (SNAPSHOT_WIDTH - PAD_X * 2 - NODE_GAP * (NODES_PER_ROW - 1)) / NODES_PER_ROW
const SPARK_WIDTH = CARD_WIDTH - 40
const SPARK_HEIGHT = 36

function NodeCard({ node }: { node: SnapshotNode }) {
  const state = node.state
  const dim = node.live ? 1 : 0.5

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: CARD_WIDTH,
        height: NODE_CARD,
        background: OG_COLORS.surface,
        border: `1px solid ${OG_COLORS.border}`,
        borderRadius: 10,
      }}
    >
      {/* Header: name and measured state. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 54,
          padding: "0 20px",
          borderBottom: `1px solid ${OG_COLORS.border}`,
        }}
      >
        <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.01em" }}>
          {truncate(node.name, 18)}
        </span>
        {state && (
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Dot color={DOT[state.status]} />
            <Mono size={16} color={TEXT[state.status]}>
              {state.label}
            </Mono>
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          height: 58,
          padding: "0 20px",
          borderBottom: `1px solid ${OG_COLORS.border}`,
          fontSize: 16,
        }}
      >
        <span style={{ display: "flex", fontWeight: 600 }}>
          {truncate(node.hardware ?? node.role ?? "", 34)}
        </span>
        <span style={{ display: "flex", color: OG_COLORS.muted }}>
          {node.live ? truncate(node.hardware ? (node.role ?? "") : "", 38) : node.lastSeen}
        </span>
      </div>

      {/* Two by two readings; a silent node's last readings are dimmed, as on the page. */}
      <div style={{ display: "flex", flexWrap: "wrap", opacity: dim, padding: "4px 0" }}>
        {node.metrics.map((metric) => (
          <div
            key={metric.label}
            style={{
              display: "flex",
              flexDirection: "column",
              width: CARD_WIDTH / 2 - 1,
              height: 80,
              padding: "10px 20px 0",
            }}
          >
            <Mono size={13} color={OG_COLORS.muted}>
              {metric.label}
            </Mono>
            <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>
              {metric.value}
            </span>
            {metric.hint && (
              <span style={{ fontSize: 13, color: OG_COLORS.muted }}>{metric.hint}</span>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "12px 20px 14px",
          borderTop: `1px solid ${OG_COLORS.border}`,
          opacity: dim,
        }}
      >
        {node.cpuTrend.length >= 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Mono size={13} color={OG_COLORS.muted}>
              cpu · last 24h
            </Mono>
            <Spark values={node.cpuTrend} />
          </div>
        )}
        {node.guests && (
          <span style={{ display: "flex", fontSize: 15, color: OG_COLORS.muted }}>
            {node.guests}
          </span>
        )}
      </div>
    </div>
  )
}

/** The 24h CPU line on a fixed 0-100 scale: muted ink, the latest point in foreground. */
function Spark({ values }: { values: number[] }) {
  const points = sparklinePoints(values, SPARK_WIDTH, SPARK_HEIGHT, 3, [0, 100])
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ")
  const last = points[points.length - 1]
  return (
    <svg width={SPARK_WIDTH} height={SPARK_HEIGHT} viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}>
      <line
        x1={0}
        y1={SPARK_HEIGHT - 1}
        x2={SPARK_WIDTH}
        y2={SPARK_HEIGHT - 1}
        stroke={OG_COLORS.border}
        strokeWidth={1}
      />
      <path d={d} fill="none" stroke={OG_COLORS.muted} strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r={2.5} fill={OG_COLORS.foreground} />
    </svg>
  )
}

function Storage({ pools }: { pools: SnapshotPool[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", marginTop: GAP }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: STORAGE_HEAD,
          borderBottom: `1px solid ${OG_COLORS.border}`,
        }}
      >
        <Mono size={15} color={OG_COLORS.muted}>
          storage
        </Mono>
        <Mono size={15} color={OG_COLORS.muted}>
          zfs pools · backups
        </Mono>
      </div>
      {pools.map((pool) => (
        <Row key={`${pool.where}:${pool.label}`}>
          <span style={{ display: "flex", width: 360, gap: 10, alignItems: "baseline" }}>
            <span style={{ fontWeight: 600 }}>{truncate(pool.label, 22)}</span>
            <span style={{ color: OG_COLORS.muted, fontSize: 15 }}>{truncate(pool.where, 16)}</span>
          </span>
          <span style={{ display: "flex", width: 210, color: OG_COLORS.muted }}>{pool.size}</span>
          <Meter pct={pool.usedPct} />
          <span style={{ display: "flex", width: 70, justifyContent: "flex-end" }}>
            {Math.round(pool.usedPct)}%
          </span>
          <span style={{ display: "flex", width: 150, justifyContent: "flex-end", gap: 8 }}>
            {pool.health && <Dot color={DOT[pool.health.status]} />}
            {pool.health && (
              <Mono size={15} color={TEXT[pool.health.status]}>
                {pool.health.label}
              </Mono>
            )}
          </span>
        </Row>
      ))}
    </div>
  )
}

function Row({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: STORAGE_ROW,
        fontSize: 17,
        borderBottom: `1px solid ${OG_COLORS.border}`,
      }}
    >
      {children}
    </div>
  )
}

/** Usage is ink, not status: a full disk is a fact, the pool's health says whether it's a problem. */
function Meter({ pct }: { pct: number }) {
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        height: 6,
        borderRadius: 3,
        background: OG_COLORS.surface2,
        border: `1px solid ${BORDER_STRONG}`,
      }}
    >
      <div
        style={{
          width: `${Math.max(1, pct)}%`,
          height: "100%",
          borderRadius: 3,
          background: OG_COLORS.muted,
        }}
      />
    </div>
  )
}
