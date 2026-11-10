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

**Never sent:** hostnames, IPs, guest names, vmids or tags, pool names or layout, kernel or PVE versions, CPU flags, or serials.

Check this yourself at any time without sending anything:

```sh
set -a; . /etc/lab-heartbeat.env; DRY_RUN=1 /usr/local/bin/lab-heartbeat
```

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
