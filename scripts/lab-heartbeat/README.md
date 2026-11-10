# Homecave heartbeat

Feeds [itsashik.dev/homecave](https://www.itsashik.dev/homecave) without exposing anything on the
lab: each Proxmox node **calls out** every 30 seconds with a signed, anonymized report of itself.
The site stores the latest report and 24h of 5-minute samples per node in Upstash.

- **Up** (green) only for a node's own report that's under ~90 seconds old.
- **Down** (red) when a node is silent and a fresh peer sees it offline.
- **No data** (grey) otherwise.

`heartbeat.py` is standard-library Python (python3 ships with Proxmox VE). It reads only its own
node through the local API with a **read-only PVEAuditor token**, verifying TLS against the
cluster CA.

## What leaves the lab
Public names and rounded numbers, nothing else:

| Area | What's sent |
|---|---|
| Node | public name, uptime (to the hour), CPU % and short model ("Ryzen 5 3600") with cores and threads, load 1/5/15, memory and swap %, network in/out KB/s |
| Guests | running/total **per category** (`media, network, storage, security, home, apps, other`), never names or ids |
| Storage | per **label** (never pool names): used/total GiB, ZFS health. Shared stores (off-site backups) come from one node only |
| Peers | the other nodes' online flags, by public name |
| Resources | CPU % (of the node) and memory GiB used by running guests, **per category** |
| Collector (optional) | see below |

**Never sent:** hostnames, IPs, guest names, vmids or tags, pool names or layout, kernel or PVE versions, CPU flags, or serials.

Check this yourself at any time without sending anything:

```sh
set -a; . /etc/lab-heartbeat.env; DRY_RUN=1 /usr/local/bin/lab-heartbeat
```

## The collector (inside the guests)
The read-only token can't see inside containers, so `collect.py` runs as **root** on a 60s timer
and never sends anything itself. It runs a fixed set of read-only checks and writes an
already-anonymized `/run/lab-collect/collect.json`, which the sender merges into its next report
when it's under 3 minutes old:

| Section | What's sent | How it's measured |
|---|---|---|
| Services | `{name, up}` for the public names in its config only | `systemctl is-active`, `docker ps`, `pidof` inside the guest (`lxc-attach` / `qm guest exec`); a stopped guest is down, a failed check is left out |
| Containers | healthy/total across the configured guests | `docker ps`; finished one-shot jobs (`Exited (0)`) aren't counted; private containers only add to the counts |
| Temperatures | CPU package °C, hottest disk °C | hwmon (`k10temp`/`coretemp`), `smartctl -n standby` (never wakes a disk) |
| GPU | utilisation %, VRAM, encoder sessions, °C | `nvidia-smi` |
| Scrubs | per public pool label: last scrub date, errors | `zpool status` |
| Backups | last nightly round: when, worst status, guests covered/total | `pvesh` tasks and backup jobs |
| WAN | latency to the fastest public resolver, % loss | 5 pings each |
| Edge | requests/min, % 5xx over 2h | counts new lines in the reverse proxy's access log |
| DNS | queries and % blocked over up to 24h | counts new lines in AdGuard's query log |
| Media | GB saved by re-encoding | Tdarr's local statistics API |

Log counting is incremental (by byte offset, in `/var/lib/lab-collect/state.json`), so lines,
paths, client IPs and domains are never read twice and never leave the collector. Slow probes
are refreshed less often (backups and scrubs every 15 min, disk temperature, WAN and Tdarr
every 5).

Config `/etc/lab-collect.json` (root, 600), per node; every section is optional:
```json
{"services": [{"name": "Jellyfin", "ct": 104, "systemd": "jellyfin"},
              {"name": "Traefik", "vm": 150, "docker": ["traefik"]},
              {"name": "AdGuard Home", "ct": 100, "process": "AdGuardHome"},
              {"name": "Proxmox Backup Server", "storage": "pbs-sea"}],
 "docker": ["ct:106", "vm:150"],
 "edge": {"vm": 150, "log": "/opt/traefik/logs/access.log"},
 "dns": {"ct": 100, "log": "/opt/AdGuardHome/data/querylog.json"},
 "tdarr": {"ct": 107, "url": "http://localhost:8265"},
 "wan": ["1.1.1.1", "8.8.8.8"], "gpu": true, "backup": true}
```
Service names must match the Homecave rows in the Studio (that's where the badges go).
Install: `install -m 755 collect.py /usr/local/bin/lab-collect`, copy `lab-collect.service` and
`.timer`, `systemctl enable --now lab-collect.timer`. Check it with
`set -a; . /etc/lab-heartbeat.env; DRY_RUN=1 /usr/local/bin/lab-collect` (prints, sends nothing).
Tests: `python3 -I test_collect.py`.

## Install (on every node)

1. **Token** (once, on any node; tokens are cluster-wide):
   ```sh
   pveum user add heartbeat@pve --comment "itsashik.dev heartbeat (read-only)"
   pveum acl modify / --users heartbeat@pve --roles PVEAuditor
   pveum user token add heartbeat@pve site --privsep 0   # prints the secret once
   ```
2. **Shared secret:** `openssl rand -hex 32`. Put it in Vercel as `LAB_HEARTBEAT_SECRET`, with
   Upstash (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, or the Vercel integration's
   `KV_REST_API_URL` / `KV_REST_API_TOKEN`).
3. **Config** `/etc/lab-heartbeat.env` (mode 600, root). It's the same on every node, except that
   `REPORT_SHARED=1` goes on exactly one node:
   ```sh
   PVE_TOKEN_ID=heartbeat@pve!site
   PVE_TOKEN_SECRET=<from step 1>
   LAB_HEARTBEAT_SECRET=<from step 2>
   LAB_HEARTBEAT_URL=https://www.itsashik.dev/api/lab-heartbeat
   NODE_NAMES="pve=Tower,pve-1=Mini PC #1,pve-2=Mini PC #2"
   STORAGE_LABELS="big-tank=Bulk storage,local-zfs=VM disks,pbs-sea=Off-site backups"
   ZFS_LABELS="big-tank=Bulk storage,rpool=VM disks"
   GUEST_CATEGORIES="104=media,107=media,103=media,150=network,101=network,..."
   REPORT_SHARED=1
   ```
   Public node names must match the Homecave "Homelab" rows in the Studio, so each node panel
   gets its spec line. Unmapped storage is skipped, unmapped guests count as `other`, and a
   node missing from `NODE_NAMES` refuses to send.
4. **Install and start:**
   ```sh
   install -m 755 heartbeat.py /usr/local/bin/lab-heartbeat
   install -m 644 lab-heartbeat.service lab-heartbeat.timer /etc/systemd/system/
   systemctl daemon-reload && systemctl enable --now lab-heartbeat.timer
   systemctl start lab-heartbeat.service && journalctl -u lab-heartbeat -n 5
   ```
   A healthy run logs nothing (HTTP 204).
   - `401`: a secret mismatch, or a clock more than 5 minutes off.
   - `501`: the site's env vars aren't set.
   - `409`: ignored (a report for that node already arrived).

## Budget
Three nodes every 30s is 8,640 heartbeats a day. Each is **one** Upstash command (a Lua `EVAL`
that checks replay, stores the latest report and appends history at most every 5 minutes). Reads
of `/api/lab-status` are two commands and are CDN-cached for 30s.

That works out to roughly 10–14k commands a day (about 300–420k a month), inside Upstash's free
tier of 500k a month, and about 260k Vercel function invocations a month. Check both against
your plans.
