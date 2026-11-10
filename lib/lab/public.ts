import type { LabNodeStatus, LabStatus, LabStorage } from "./types"

/**
 * The public shape, rebuilt field by field (an allowlist on the way out too), so nothing a
 * future store format might hold can leak through `/api/lab-status` or a server render.
 */
export function toPublicStatus(status: LabStatus): LabStatus {
  return {
    nodes: status.nodes.map((n): LabNodeStatus => ({
      name: n.name,
      online: n.online,
      uptime: n.uptime,
      ...(n.interval !== undefined && { interval: n.interval }),
      ...(n.cpu && {
        cpu: { pct: n.cpu.pct, model: n.cpu.model, cores: n.cpu.cores, threads: n.cpu.threads },
      }),
      ...(n.load && { load: [n.load[0], n.load[1], n.load[2]] as [number, number, number] }),
      ...(n.mem && { mem: { pct: n.mem.pct, totalGiB: n.mem.totalGiB } }),
      ...(n.swap && { swap: { pct: n.swap.pct, totalGiB: n.swap.totalGiB } }),
      ...(n.net && { net: { inKBps: n.net.inKBps, outKBps: n.net.outKBps } }),
      ...(n.guests && {
        guests: {
          running: n.guests.running,
          total: n.guests.total,
          byCategory: Object.fromEntries(
            Object.entries(n.guests.byCategory).map(([k, v]) => [k, [v![0], v![1]]]),
          ),
        },
      }),
      ...(n.storage && {
        storage: n.storage.map((s): LabStorage => ({
          label: s.label,
          usedGiB: s.usedGiB,
          totalGiB: s.totalGiB,
          health: s.health,
          kind: s.kind,
        })),
      }),
      ...(n.peers && { peers: n.peers.map((p) => ({ name: p.name, online: p.online })) }),
      receivedAt: n.receivedAt,
      history: {
        t: [...n.history.t],
        cpu: [...n.history.cpu],
        mem: [...n.history.mem],
        netIn: [...n.history.netIn],
        netOut: [...n.history.netOut],
      },
      availability24h: n.availability24h,
    })),
  }
}
