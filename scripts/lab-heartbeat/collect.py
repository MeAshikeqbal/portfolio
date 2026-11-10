#!/usr/bin/python3 -I
"""Homecave collector: one per Proxmox node, as root, every 60 seconds. Never touches the network
except for the WAN pings it's configured to send.

Looks inside this node's guests with a fixed set of read-only commands (pct exec / qm guest exec
running `systemctl is-active`, `docker ps`, `pidof`, counting log lines) and the host's own
sensors, ZFS, GPU and backup tasks. It reduces everything to public names and numbers *here*,
and writes only that to /run/lab-collect/collect.json (0644). The unprivileged heartbeat sender
merges it into its next signed report. Guest names, container names, log lines, client IPs and
domains never leave this process.

Config: /etc/lab-collect.json (root, 0600). Every section is optional:
  {
    "services": [                              public name -> how to check it
      {"name": "Jellyfin", "ct": 104, "systemd": "jellyfin"},
      {"name": "Frigate", "ct": 106, "docker": ["frigate"]},
      {"name": "Traefik", "vm": 150, "docker": ["traefik"]},
      {"name": "AdGuard Home", "ct": 100, "process": "AdGuardHome"},
      {"name": "Proxmox Backup Server", "storage": "pbs-sea"}
    ],
    "docker": ["ct:106", "vm:150"],            guests whose containers count toward health
    "edge": {"vm": 150, "log": "/opt/traefik/logs/access.log"},     Traefik access log
    "dns": {"ct": 100, "log": "/opt/AdGuardHome/data/querylog.json"},
    "tdarr": {"ct": 107, "url": "http://localhost:8265"},
    "wan": ["1.1.1.1", "8.8.8.8"],
    "gpu": true, "backup": true
  }
Scrubs and temperatures are always collected. ZFS_LABELS comes from /etc/lab-heartbeat.env.
"""

import json
import os
import re
import subprocess
import sys
import time

CONFIG = "/etc/lab-collect.json"
OUT_DIR = "/run/lab-collect"
STATE = "/var/lib/lab-collect/state.json"
HOUR = 3600
GUEST_PATH = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
# Seconds between refreshes, per section; in between, the last value is reused.
EVERY = {"temps": 60, "disk": 300, "scrubs": 900, "gpu": 60, "wan": 300, "backup": 900,
         "edge": 60, "dns": 300, "media": 300, "storage": 300}
SERVICE_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 #,+_-]{0,47}$")


def run(args, timeout=20):
    """stdout of a command, or None if it failed or timed out."""
    try:
        p = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    except (OSError, subprocess.TimeoutExpired):
        return None
    return p.stdout if p.returncode == 0 else None


def env_map(name):
    raw = os.environ.get(name, "")
    return dict(pair.split("=", 1) for pair in (p.strip() for p in raw.split(",")) if "=" in pair)


# --- guests -------------------------------------------------------------------------------

def guest_running(kind, vmid):
    """Cheap state checks (Proxmox's own CLIs are Perl and cost ~0.6s each)."""
    if kind == "ct":
        out = run(["lxc-info", "-n", str(vmid), "-s"], timeout=10)
        return None if out is None else "RUNNING" in out
    try:
        with open(f"/var/run/qemu-server/{int(vmid)}.pid") as f:
            return os.path.exists(f"/proc/{int(f.read().strip())}")
    except FileNotFoundError:
        return False
    except (OSError, ValueError):
        return None


def in_guest(kind, vmid, script, timeout=20):
    """Run a shell snippet inside a container (pct exec) or VM (guest agent). None on failure."""
    if kind == "ct":
        # lxc-attach directly: what `pct exec` does, without Perl's startup cost.
        return run(["lxc-attach", "-n", str(vmid), "--clear-env", "--set-var", f"PATH={GUEST_PATH}",
                    "--", "sh", "-c", script], timeout)
    out = run(["qm", "guest", "exec", str(vmid), "--timeout", str(timeout), "--", "sh", "-c", script], timeout + 5)
    if out is None:
        return None
    try:
        res = json.loads(out)
    except ValueError:
        return None
    return res.get("out-data", "") if res.get("exitcode") == 0 else None


def docker_states(kind, vmid):
    """{container name: (state, status)} for one guest, or None if docker isn't reachable."""
    out = in_guest(kind, vmid, "docker ps -a --format '{{.Names}}|{{.State}}|{{.Status}}'")
    if out is None:
        return None
    states = {}
    for line in out.splitlines():
        parts = line.split("|", 2)
        if len(parts) == 3:
            states[parts[0]] = (parts[1], parts[2])
    return states


def container_ok(state, status):
    return state == "running" and "(unhealthy)" not in status and "(health: starting)" not in status


def counted(state, status):
    """One-shot jobs that finished cleanly (migrations, seeds) aren't expected to be running."""
    return not (state == "exited" and status.startswith("Exited (0)"))


def services_and_containers(config, state, now):
    docker_cache = {}

    def docker_for(kind, vmid):
        key = f"{kind}:{vmid}"
        if key not in docker_cache:
            docker_cache[key] = docker_states(kind, vmid)
        return docker_cache[key]

    services = []
    for svc in config.get("services", []):
        name = svc.get("name", "")
        if not SERVICE_NAME.match(name):
            continue
        if "storage" in svc:
            def storage_up(storage=svc["storage"]):
                out = run(["pvesm", "status", "--storage", storage], timeout=15)
                if out is None:
                    return None
                rows = [l.split() for l in out.splitlines()[1:]]
                return any(len(r) > 2 and r[2] == "active" for r in rows)
            up = cached(state, f"storage:{svc['storage']}", now, storage_up)
            if up is not None:
                services.append({"name": name, "up": up})
            continue
        kind = "ct" if "ct" in svc else "vm"
        vmid = int(svc.get(kind, -1))
        running = guest_running(kind, vmid)
        if running is None:
            continue  # can't tell: leave it out rather than claim anything
        if not running:
            services.append({"name": name, "up": False})
            continue
        if "systemd" in svc:
            out = in_guest(kind, vmid, f"systemctl is-active {svc['systemd']} || true")
            up = None if out is None else out.strip() == "active"
        elif "process" in svc:
            out = in_guest(kind, vmid, f"pidof {svc['process']} >/dev/null && echo up || echo down")
            up = None if out is None else out.strip() == "up"
        elif "docker" in svc:
            states = docker_for(kind, vmid)
            up = None if states is None else all(
                c in states and container_ok(*states[c]) for c in svc["docker"]
            )
        else:
            up = None
        if up is not None:
            services.append({"name": name, "up": up})

    ok = total = 0
    seen_any = False
    for ref in config.get("docker", []):
        kind, _, vmid = ref.partition(":")
        try:
            vmid = int(vmid)
        except ValueError:
            continue
        if guest_running(kind, vmid) is not True:
            continue
        states = docker_for(kind, vmid)
        if states is None:
            continue
        seen_any = True
        for state, status in states.values():
            if counted(state, status):
                total += 1
                ok += container_ok(state, status)
    containers = {"ok": ok, "total": total} if seen_any else None
    return services, containers


# --- host ---------------------------------------------------------------------------------

def read_int(path):
    try:
        with open(path) as f:
            return int(f.read().strip())
    except (OSError, ValueError):
        return None


def cpu_temp():
    """CPU package temperature from hwmon: k10temp (AMD Tctl/Tdie) or coretemp (Intel package)."""
    base = "/sys/class/hwmon"
    try:
        hwmons = os.listdir(base)
    except OSError:
        return None
    for hw in sorted(hwmons):
        path = os.path.join(base, hw)
        try:
            with open(os.path.join(path, "name")) as f:
                chip = f.read().strip()
        except OSError:
            continue
        if chip not in ("k10temp", "coretemp"):
            continue
        found = {}
        for entry in os.listdir(path):
            if entry.startswith("temp") and entry.endswith("_label"):
                with open(os.path.join(path, entry)) as f:
                    found[f.read().strip()] = os.path.join(path, entry.replace("_label", "_input"))
        best = None
        for label in ("Tdie", "Tctl", "Package id 0"):
            if label in found:
                best = read_int(found[label])
                if best is not None:
                    break
        if best is None:
            best = read_int(os.path.join(path, "temp1_input"))
        if best is not None:
            return round(best / 1000)
    return None


def disk_temp():
    """The hottest disk (SATA or NVMe), without waking a sleeping drive."""
    scan = run(["smartctl", "--scan"], timeout=15)
    if scan is None:
        return None
    temps = []
    for line in scan.splitlines():
        dev = line.split()[0] if line.strip() else ""
        if not dev.startswith("/dev/"):
            continue
        out = subprocess.run(["smartctl", "-n", "standby", "-j", "-A", dev], capture_output=True, text=True, timeout=20).stdout
        try:
            t = json.loads(out).get("temperature", {}).get("current")
        except ValueError:
            t = None
        if isinstance(t, (int, float)) and 0 < t < 100:
            temps.append(int(t))
    return max(temps) if temps else None


def scrubs():
    labels = env_map("ZFS_LABELS")
    out = run(["zpool", "status"], timeout=20)
    if out is None:
        return None
    result, pool = [], None
    for line in out.splitlines():
        line = line.strip()
        if line.startswith("pool:"):
            pool = line.split(":", 1)[1].strip()
        m = re.match(r"scan: scrub repaired \S+ in \S+ with (\d+) errors on (.+)$", line)
        if m and pool in labels:
            try:
                at = int(time.mktime(time.strptime(m.group(2).strip(), "%a %b %d %H:%M:%S %Y")))
            except ValueError:
                continue
            result.append({"label": labels[pool], "at": at, "errors": int(m.group(1))})
    return result


def gpu():
    out = run(["nvidia-smi", "--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu,encoder.stats.sessionCount",
               "--format=csv,noheader,nounits"], timeout=15)
    if not out:
        return None
    try:
        util, used, total, temp, enc = [int(float(x)) for x in out.splitlines()[0].split(",")]
    except ValueError:
        return None
    return {"utilPct": util, "memUsedMiB": used, "memTotalMiB": total, "tempC": temp, "encoders": enc}


def wan(targets):
    procs = [subprocess.Popen(["ping", "-n", "-q", "-c", "5", "-W", "2", t], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
             for t in targets]
    rtts, sent, lost = [], 0, 0
    for p in procs:
        try:
            out, _ = p.communicate(timeout=20)
        except subprocess.TimeoutExpired:
            p.kill()
            continue
        m = re.search(r"(\d+) packets transmitted, (\d+) received", out or "")
        if m:
            sent += int(m.group(1))
            lost += int(m.group(1)) - int(m.group(2))
        r = re.search(r"= [\d.]+/([\d.]+)/", out or "")
        if r:
            rtts.append(float(r.group(1)))
    if sent == 0:
        return None
    # The fastest resolver reflects the line itself, not one provider's routing.
    return {"rttMs": round(min(rtts), 1) if rtts else None, "lossPct": round(lost / sent * 100)}


def backup():
    """The latest nightly backup round across the cluster, and how many guests the jobs cover."""
    tasks = run(["pvesh", "get", "/cluster/tasks", "--output-format", "json"], timeout=20)
    jobs = run(["pvesh", "get", "/cluster/backup", "--output-format", "json"], timeout=20)
    guests = run(["pvesh", "get", "/cluster/resources", "--type", "vm", "--output-format", "json"], timeout=20)
    if tasks is None or jobs is None or guests is None:
        return None
    dumps = [t for t in json.loads(tasks) if t.get("type") == "vzdump" and t.get("endtime")]
    if not dumps:
        return None
    latest = max(t["starttime"] for t in dumps)
    round_ = [t for t in dumps if latest - t["starttime"] < 6 * HOUR]
    statuses = [t.get("status", "") for t in round_]
    status = "ok" if all(s == "OK" for s in statuses) else (
        "warnings" if all(s == "OK" or s.startswith("WARNINGS") for s in statuses) else "failed")
    all_ids = {str(g["vmid"]) for g in json.loads(guests) if not g.get("template")}
    covered = set()
    for job in json.loads(jobs):
        if not job.get("enabled", 1):
            continue
        if job.get("all"):
            excluded = set(str(job.get("exclude", "")).replace(" ", "").split(",")) - {""}
            covered |= all_ids - excluded
        else:
            covered |= set(str(job.get("vmid", "")).replace(" ", "").split(",")) & all_ids
    return {"at": int(max(t["endtime"] for t in round_)), "status": status, "covered": len(covered), "total": len(all_ids)}


# --- counted logs (incremental, by offset) -------------------------------------------------

def count_new_lines(kind, vmid, path, offset, awk):
    """Size of a log inside a guest, and awk's counts over the bytes written since `offset`."""
    if offset is None:  # first run: just learn where the log ends, read nothing
        out = in_guest(kind, vmid, f"stat -c %s {path}", timeout=15)
        try:
            return int(out.split()[0]), 0, 0
        except (AttributeError, IndexError, ValueError):
            return None
    script = (
        f"f={path}; s=$(stat -c %s \"$f\") || exit 1; o={int(offset)}; "
        "[ \"$o\" -gt \"$s\" ] && o=0; echo \"$s\"; "
        f"if [ \"$o\" -lt \"$s\" ]; then tail -c +$((o+1)) \"$f\" | head -c $((s-o)) | awk '{awk}'; else echo '0 0'; fi"
    )
    out = in_guest(kind, vmid, script, timeout=30)
    if out is None:
        return None
    lines = out.split()
    try:
        return int(lines[0]), int(lines[1]), int(lines[2])
    except (IndexError, ValueError):
        return None


def roll(buckets, now, n, flagged):
    """Hourly [count, flagged] buckets keyed by hour start; keeps the last 24."""
    hour = str(int(now // HOUR * HOUR))
    b = buckets.setdefault(hour, [0, 0])
    b[0] += n
    b[1] += flagged
    for key in sorted(buckets, key=int)[:-24]:
        del buckets[key]


def edge(cfg, state, now):
    s = state.setdefault("edge", {})
    res = count_new_lines("vm" if "vm" in cfg else "ct", cfg.get("vm", cfg.get("ct")), cfg["log"],
                          s.get("offset"),
                          "{n++} $9 ~ /^5/ {e++} END {print n+0, e+0}")
    if res is None:
        return None
    size, n, errors = res
    first = "offset" not in s
    last_at = s.get("at", now)
    s["offset"], s["at"] = size, now
    if first:
        return None  # start counting from now
    roll(s.setdefault("hours", {}), now, n, errors)
    hours = s["hours"]
    recent = [v for k, v in hours.items() if now - int(k) < 2 * HOUR]
    total = sum(v[0] for v in recent)
    elapsed = max(1, now - last_at)
    return {"rpm": round(n / elapsed * 60, 1), "errPct": round(sum(v[1] for v in recent) / total * 100, 1) if total else 0}


def dns(cfg, state, now):
    s = state.setdefault("dns", {})
    res = count_new_lines("ct", cfg["ct"], cfg["log"], s.get("offset"),
                          "{n++} /\"IsFiltered\":true/ {b++} END {print n+0, b+0}")
    if res is None:
        return None
    size, n, blocked = res
    first = "offset" not in s
    s["offset"] = size
    s.setdefault("since", now)
    if first:
        return None
    roll(s.setdefault("hours", {}), now, n, blocked)
    queries = sum(v[0] for v in s["hours"].values())
    hours = min(24, max(1, int((now - s["since"]) // HOUR)))
    if queries == 0:
        return None
    return {"queries": queries, "blockedPct": round(sum(v[1] for v in s["hours"].values()) / queries * 100, 1), "hours": hours}


def tdarr(cfg):
    body = '{"data":{"collection":"StatisticsJSONDB","mode":"getById","docID":"statistics"}}'
    out = in_guest("ct", cfg["ct"], f"curl -s -m 10 -X POST {cfg['url']}/api/v2/cruddb -H content-type:application/json -d '{body}'")
    try:
        saved = float(json.loads(out or "")["sizeDiff"])
    except (ValueError, KeyError, TypeError):
        return None
    return {"savedGB": max(0, round(saved))}


def cached(state, key, now, fn):
    """fn()'s value, refreshed at most every EVERY[key] seconds (kept in the state file)."""
    cache = state.setdefault("cache", {})
    hit = cache.get(key)
    if hit and now - hit["at"] < EVERY.get(key, 60):
        return hit["value"]
    value = fn()
    cache[key] = {"at": now, "value": value}
    return value


# --- main ---------------------------------------------------------------------------------

def main():
    try:
        with open(CONFIG) as f:
            config = json.load(f)
    except FileNotFoundError:
        config = {}
    try:
        with open(STATE) as f:
            state = json.load(f)
    except (OSError, ValueError):
        state = {}
    now = int(time.time())

    out = {"at": now}
    sections = {
        "temps": lambda: {"cpuC": cpu_temp(), "diskC": cached(state, "disk", now, disk_temp)},
        "scrubs": lambda: cached(state, "scrubs", now, scrubs),
    }
    if config.get("services") or config.get("docker"):
        services, containers = services_and_containers(config, state, now)
        out["services"] = services
        if containers:
            out["containers"] = containers
    if config.get("gpu"):
        sections["gpu"] = gpu
    if config.get("wan"):
        sections["wan"] = lambda: cached(state, "wan", now, lambda: wan(config["wan"]))
    if config.get("backup"):
        sections["backup"] = lambda: cached(state, "backup", now, backup)
    if config.get("edge"):
        sections["edge"] = lambda: edge(config["edge"], state, now)
    if config.get("dns"):
        sections["dns"] = lambda: dns(config["dns"], state, now)
    if config.get("tdarr"):
        sections["media"] = lambda: cached(state, "media", now, lambda: tdarr(config["tdarr"]))
    for key, fn in sections.items():
        try:
            value = fn()
        except Exception as error:  # one broken probe never takes the others down
            print(f"collect: {key}: {error.__class__.__name__}", file=sys.stderr)
            value = None
        if value is not None:
            out[key] = value

    if os.environ.get("DRY_RUN") == "1":  # print, and leave the log offsets where they were
        print(json.dumps(out, indent=1))
        return
    os.makedirs(os.path.dirname(STATE), exist_ok=True)
    with open(STATE + ".tmp", "w") as f:
        json.dump(state, f)
    os.replace(STATE + ".tmp", STATE)
    os.makedirs(OUT_DIR, exist_ok=True)
    tmp = os.path.join(OUT_DIR, "collect.json.tmp")
    with open(tmp, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    os.chmod(tmp, 0o644)
    os.replace(tmp, os.path.join(OUT_DIR, "collect.json"))


if __name__ == "__main__":
    main()
