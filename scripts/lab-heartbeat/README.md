# Homelab heartbeat

Tells itsashik.dev whether the Proxmox nodes are up, without exposing anything on the lab:
the lab **calls out** every 5 minutes with a signed JSON list of public machine names,
online state and uptime. The site stores the latest one in Upstash and shows it on the hero
and `/uses`. Green only when the heartbeat is under 10 minutes old; otherwise "no data".

Install on **one** cluster node (it sees all nodes).

1. **Read-only API token** (on any node):
   ```sh
   pveum user add heartbeat@pve --comment "itsashik.dev heartbeat (read-only)"
   pveum acl modify / --users heartbeat@pve --roles PVEAuditor
   pveum user token add heartbeat@pve site --privsep 0   # prints the secret once
   ```
2. **Shared secret:** `openssl rand -hex 32`. Put it in Vercel as `LAB_HEARTBEAT_SECRET`,
   together with Upstash (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, or the
   Vercel integration's `KV_REST_API_URL` / `KV_REST_API_TOKEN`), and redeploy.
3. **Config** `/etc/lab-heartbeat.env` (mode 600, root):
   ```sh
   PVE_TOKEN_ID=heartbeat@pve!site
   PVE_TOKEN_SECRET=<from step 1>
   LAB_HEARTBEAT_SECRET=<from step 2>
   LAB_HEARTBEAT_URL=https://www.itsashik.dev/api/lab-heartbeat
   NODE_NAMES="pve=Tower,pve-1=Mini PC #1,pve-2=Mini PC #2"
   ```
   The public names must match the `/uses` Homelab row names exactly. Unmapped nodes are
   never sent, and hostnames never leave the lab.
4. **Install and start:**
   ```sh
   install -m 755 heartbeat.sh /usr/local/bin/lab-heartbeat
   install -m 644 lab-heartbeat.service lab-heartbeat.timer /etc/systemd/system/
   systemctl daemon-reload && systemctl enable --now lab-heartbeat.timer
   systemctl start lab-heartbeat.service && journalctl -u lab-heartbeat -n 5
   ```
   A healthy run logs nothing (HTTP 204). `401` is a secret mismatch or a clock more than
   5 minutes off; `409` means another node also sends heartbeats (run it on one only);
   `501` means the site's env vars aren't set yet.

Needs `curl`, `openssl` and `python3`, all present on Proxmox VE.
