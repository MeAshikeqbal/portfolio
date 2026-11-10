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
      ...(n.resources && {
        resources: Object.fromEntries(
          Object.entries(n.resources).map(([k, v]) => [
            k,
            { cpuPct: v!.cpuPct, memGiB: v!.memGiB },
          ]),
        ),
      }),
      ...(n.peers && { peers: n.peers.map((p) => ({ name: p.name, online: p.online })) }),
      ...(n.services && { services: n.services.map((s) => ({ name: s.name, up: s.up })) }),
      ...(n.containers && { containers: { ok: n.containers.ok, total: n.containers.total } }),
      ...(n.temps && { temps: { cpuC: n.temps.cpuC, diskC: n.temps.diskC } }),
      ...(n.gpu && {
        gpu: {
          utilPct: n.gpu.utilPct,
          memUsedMiB: n.gpu.memUsedMiB,
          memTotalMiB: n.gpu.memTotalMiB,
          tempC: n.gpu.tempC,
          encoders: n.gpu.encoders,
        },
      }),
      ...(n.scrubs && {
        scrubs: n.scrubs.map((s) => ({ label: s.label, at: s.at, errors: s.errors })),
      }),
      ...(n.backup && {
        backup: {
          at: n.backup.at,
          status: n.backup.status,
          covered: n.backup.covered,
          total: n.backup.total,
        },
      }),
      ...(n.wan && { wan: { rttMs: n.wan.rttMs, lossPct: n.wan.lossPct } }),
      ...(n.edge && { edge: { rpm: n.edge.rpm, errPct: n.edge.errPct } }),
      ...(n.dns && {
        dns: { queries: n.dns.queries, blockedPct: n.dns.blockedPct, hours: n.dns.hours },
      }),
      ...(n.media && { media: { savedGB: n.media.savedGB } }),
      ...(n.security && {
        security: {
          bans: n.security.bans,
          attacks24h: n.security.attacks24h,
          hourly: [...n.security.hourly],
          byKind: Object.fromEntries(Object.entries(n.security.byKind).map(([k, v]) => [k, v])),
          ...(n.security.blocklist && {
            blocklist: {
              total: n.security.blocklist.total,
              byKind: Object.fromEntries(
                Object.entries(n.security.blocklist.byKind).map(([k, v]) => [k, v]),
              ),
            },
          }),
          ...(n.security.checkedHourly && {
            checked24h: n.security.checked24h,
            checkedHourly: [...n.security.checkedHourly],
          }),
        },
      }),
      receivedAt: n.receivedAt,
      history: {
        t: [...n.history.t],
        cpu: [...n.history.cpu],
        mem: [...n.history.mem],
        netIn: [...n.history.netIn],
        netOut: [...n.history.netOut],
        temp: [...(n.history.temp ?? [])],
        gpu: [...(n.history.gpu ?? [])],
        edge: [...(n.history.edge ?? [])],
      },
      availability24h: n.availability24h,
    })),
  }
}
