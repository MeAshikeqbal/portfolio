#!/usr/bin/python3 -I
"""Homecave heartbeat agent (v2): one per Proxmox node, every 30 seconds.

Reads only *this* node from the local Proxmox API with a read-only (PVEAuditor) token, reduces
it to public names and rounded numbers, signs it and POSTs it to the site. The site never
connects to the lab. Standard library only (python3 ships with Proxmox VE).

Config: environment (systemd EnvironmentFile=/etc/lab-heartbeat.env, mode 600):
  PVE_TOKEN_ID=heartbeat@pve!site           read-only API token id
  PVE_TOKEN_SECRET=...                       its secret
  LAB_HEARTBEAT_SECRET=...                   shared with Vercel's LAB_HEARTBEAT_SECRET
  LAB_HEARTBEAT_URL=https://www.itsashik.dev/api/lab-heartbeat
  NODE_NAMES="pve=Tower,pve-1=Mini PC #1,pve-2=Mini PC #2"     hostname=public name
  STORAGE_LABELS="big-tank=Bulk storage,local-zfs=VM disks,pbs-sea=Off-site backups"
  ZFS_LABELS="big-tank=Bulk storage,rpool=VM disks"            pool=label (for health)
  GUEST_CATEGORIES="104=media,107=media,..."                   vmid=category (else other)
  REPORT_SHARED=1          on one node only: report shared stores (off-site backups) once
  NODE_SELF=pve            optional; defaults to this machine's short hostname
  PVE_API_URL=https://localhost:8006   PVE_CA=/etc/pve/pve-root-ca.pem   (optional)

Never sent: hostnames, IPs, guest names/vmids/tags, pool names, versions, serials, CPU flags.
"""

import hashlib
import hmac
import json
import os
import re
import socket
import ssl
import sys
import time
import urllib.request

INTERVAL = 30
CATEGORIES = {"media", "network", "storage", "security", "home", "apps", "other"}
GIB = 1024**3


def env_map(name):
    raw = os.environ.get(name, "")
    return dict(
        pair.split("=", 1) for pair in (p.strip() for p in raw.split(",")) if "=" in pair
    )


def api(path):
    base = os.environ.get("PVE_API_URL", "https://localhost:8006").rstrip("/")
    req = urllib.request.Request(
        f"{base}/api2/json{path}",
        headers={
            "Authorization": f"PVEAPIToken={os.environ['PVE_TOKEN_ID']}={os.environ['PVE_TOKEN_SECRET']}"
        },
    )
    context = None
    if base.startswith("https://"):
        context = ssl.create_default_context(
            cafile=os.environ.get("PVE_CA", "/etc/pve/pve-root-ca.pem")
        )
    with urllib.request.urlopen(req, timeout=10, context=context) as resp:
        return json.load(resp)["data"]


def short_cpu(model):
    """'AMD Ryzen 5 3600 6-Core Processor' -> 'Ryzen 5 3600'; 'Intel(R) Core(TM) i3-6100 CPU @ 3.70GHz' -> 'Core i3-6100'."""
    if not model:
        return None
    m = re.sub(r"\((R|TM|C)\)", "", model)
    m = re.sub(r"@.*$", "", m)
    m = re.sub(r"\b(CPU|Processor|\d+-Core|AMD|Intel)\b", "", m)
    m = re.sub(r"[^A-Za-z0-9 -]", "", m)
    m = re.sub(r"\s+", " ", m).strip()
    return m[:32] if re.fullmatch(r"[A-Za-z][A-Za-z0-9 -]{1,31}", m[:32] or "") else None


def pct(used, total):
    return max(0, min(100, round(used / total * 100))) if total else 0


def build(self_host, names):
    public = names.get(self_host)
    if not public:
        raise SystemExit(f"{self_host} is not mapped in NODE_NAMES; refusing to send")

    st = api(f"/nodes/{self_host}/status")
    cpuinfo = st.get("cpuinfo", {})
    load = [round(float(x), 2) for x in (st.get("loadavg") or ["0", "0", "0"])[:3]]
    mem, swap = st.get("memory", {}), st.get("swap", {})
    node = {
        "name": public,
        "online": True,
        "uptime": int(st.get("uptime", 0)) // 3600 * 3600,
        "interval": INTERVAL,
        "cpu": {
            "pct": round(float(st.get("cpu", 0)) * 100),
            "model": short_cpu(cpuinfo.get("model")),
            "cores": int(cpuinfo.get("cores", 1)) * int(cpuinfo.get("sockets", 1)),
            "threads": int(cpuinfo.get("cpus", 1)),
        },
        "load": load,
        "mem": {"pct": pct(mem.get("used", 0), mem.get("total", 0)), "totalGiB": round(mem.get("total", 0) / GIB, 1)},
        "swap": {"pct": pct(swap.get("used", 0), swap.get("total", 0)), "totalGiB": round(swap.get("total", 0) / GIB, 1)},
    }

    # Network: the latest averaged point that has a value (bytes/s -> KB/s).
    try:
        points = api(f"/nodes/{self_host}/rrddata?timeframe=hour&cf=AVERAGE")
        point = next(p for p in reversed(points) if p.get("netin") is not None)
        node["net"] = {"inKBps": round(point["netin"] / 1024), "outKBps": round(point.get("netout", 0) / 1024)}
    except Exception:
        pass

    # Guests: counts by public category only.
    categories = env_map("GUEST_CATEGORIES")
    by_cat, running, total = {}, 0, 0
    for g in api("/cluster/resources?type=vm"):
        if g.get("node") != self_host or g.get("template"):
            continue
        cat = categories.get(str(g.get("vmid")), "other")
        cat = cat if cat in CATEGORIES else "other"
        up = g.get("status") == "running"
        r, t = by_cat.get(cat, [0, 0])
        by_cat[cat] = [r + up, t + 1]
        running, total = running + up, total + 1
    node["guests"] = {"running": running, "total": total, "byCategory": by_cat}

    # Storage: mapped stores on this node (+ shared ones once, from REPORT_SHARED), with ZFS health.
    labels, zfs_labels = env_map("STORAGE_LABELS"), env_map("ZFS_LABELS")
    health = {}
    try:
        for pool in api(f"/nodes/{self_host}/disks/zfs"):
            label = zfs_labels.get(pool.get("name"))
            if label:
                health[label] = pool.get("health")
    except Exception:
        pass
    storage, seen = [], set()
    report_shared = os.environ.get("REPORT_SHARED") == "1"
    for s in api("/cluster/resources?type=storage"):
        label = labels.get(s.get("storage"))
        if not label or s.get("node") != self_host or s.get("status") != "available":
            continue
        if s.get("shared") and not report_shared:
            continue
        if label in seen or not s.get("maxdisk"):
            continue
        seen.add(label)
        backup = s.get("plugintype") == "pbs"
        storage.append({
            "label": label,
            "usedGiB": round(s.get("disk", 0) / GIB),
            "totalGiB": max(1, round(s["maxdisk"] / GIB)),
            "health": None if backup else health.get(label),
            "kind": "backup" if backup else "pool",
        })

    # Peers as the cluster sees them, so a silent node can be shown as down.
    peers = [
        {"name": names[n["node"]], "online": n.get("status") == "online"}
        for n in api("/cluster/resources?type=node")
        if n.get("node") != self_host and n.get("node") in names
    ]
    return {"v": 2, "node": node, "storage": storage, "peers": peers}


def main():
    names = env_map("NODE_NAMES")
    self_host = os.environ.get("NODE_SELF") or socket.gethostname().split(".")[0]
    body = json.dumps(build(self_host, names), separators=(",", ":")).encode()
    ts = str(int(time.time()))
    sig = hmac.new(os.environ["LAB_HEARTBEAT_SECRET"].encode(), ts.encode() + b"." + body, hashlib.sha256).hexdigest()
    req = urllib.request.Request(
        os.environ["LAB_HEARTBEAT_URL"],
        data=body,
        method="POST",
        headers={"content-type": "application/json", "x-lab-timestamp": ts, "x-lab-signature": sig},
    )
    if os.environ.get("DRY_RUN") == "1":
        print(body.decode())
        return
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status not in (200, 204):
                sys.exit(f"heartbeat: HTTP {resp.status}")
    except urllib.error.HTTPError as error:
        # 409 means another report for this node already arrived: harmless.
        if error.code != 409:
            sys.exit(f"heartbeat: HTTP {error.code} {error.read()[:200]!r}")


if __name__ == "__main__":
    main()
