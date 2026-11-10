"""Tests for collect.py against fixture command output (no Proxmox needed).

Run: python3 -I scripts/lab-heartbeat/test_collect.py   (also run by the unit test suite)
"""

import importlib.util
import json
import os
import sys
import time
import unittest
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("collect", os.path.join(HERE, "collect.py"))
collect = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collect)

# docker ps output inside guests: public and private containers alike.
DOCKER = {
    ("ct", 106): "frigate|running|Up 6 hours (healthy)\n",
    ("vm", 156): "producr-api-1|running|Up 6 days (healthy)\n"
                 "producr-migrate-1|exited|Exited (0) 8 days ago\n"
                 "producr-worker-1|running|Up 2 minutes (health: starting)\n",
    ("ct", 103): "sonarr|running|Up 2 days\nradarr|running|Up 1 day\nlidarr|running|Up 5 days (unhealthy)\n"
                 "qbittorrent|running|Up 27 hours\n",
}


def fake_in_guest(running, systemd=None, failing=()):
    def in_guest(kind, vmid, script, timeout=20):
        if (kind, vmid) in failing:
            return None
        if script.startswith("docker ps"):
            return DOCKER.get((kind, vmid), "")
        if script.startswith("systemctl is-active"):
            return (systemd or {}).get((kind, vmid), "inactive") + "\n"
        if script.startswith("pidof"):
            return "up\n"
        return ""
    return in_guest


class Services(unittest.TestCase):
    def collect(self, config, running, **kw):
        with mock.patch.object(collect, "guest_running", lambda k, v: running.get((k, int(v)))), \
             mock.patch.object(collect, "in_guest", fake_in_guest(running, **kw)):
            return collect.services_and_containers(config, {}, 0)

    def test_up_down_and_unknown(self):
        config = {"services": [
            {"name": "Jellyfin", "ct": 104, "systemd": "jellyfin"},
            {"name": "Frigate", "ct": 106, "docker": ["frigate"]},
            {"name": "RustFS", "ct": 111, "systemd": "rustfs"},
            {"name": "Tdarr", "ct": 107, "systemd": "tdarr-server"},
            {"name": "Vaultwarden", "ct": 105, "process": "vaultwarden"},
        ]}
        running = {("ct", 104): True, ("ct", 106): True, ("ct", 111): False, ("ct", 107): True, ("ct", 105): None}
        services, _ = self.collect(config, running, systemd={("ct", 104): "active"}, failing={("ct", 107)})
        self.assertEqual(services, [
            {"name": "Jellyfin", "up": True},
            {"name": "Frigate", "up": True},
            {"name": "RustFS", "up": False},  # guest stopped: down
            # Tdarr: the exec failed, and Vaultwarden's guest state is unknown: both left out
        ])

    def test_a_group_is_up_only_if_every_container_is_healthy(self):
        config = {"services": [{"name": "Sonarr, Radarr, Lidarr", "ct": 103, "docker": ["sonarr", "radarr", "lidarr"]}]}
        services, _ = self.collect(config, {("ct", 103): True})
        self.assertEqual(services, [{"name": "Sonarr, Radarr, Lidarr", "up": False}])

    def test_private_containers_only_add_to_counts(self):
        config = {"docker": ["ct:106", "vm:156", "ct:103"]}
        _, containers = self.collect(config, {("ct", 106): True, ("vm", 156): True, ("ct", 103): True})
        # 1 frigate + 2 producr (the finished migration isn't counted) + 4 media; starting and
        # unhealthy containers aren't ok.
        self.assertEqual(containers, {"ok": 5, "total": 7})
        self.assertNotIn("producr", json.dumps(containers))


class Host(unittest.TestCase):
    def test_scrubs_use_public_labels_and_skip_unmapped_pools(self):
        status = """  pool: big-tank
 state: ONLINE
  scan: scrub repaired 0B in 03:27:53 with 0 errors on Sun Nov  8 03:51:55 2026
  pool: secret-pool
  scan: scrub repaired 0B in 00:00:55 with 2 errors on Sun Nov  8 00:24:59 2026
"""
        with mock.patch.dict(os.environ, {"ZFS_LABELS": "big-tank=Bulk storage"}), \
             mock.patch.object(collect, "run", lambda *a, **k: status):
            result = collect.scrubs()
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["label"], "Bulk storage")
        self.assertEqual(result[0]["errors"], 0)
        self.assertNotIn("secret", json.dumps(result))

    def test_backup_round_is_the_worst_status_and_counts_coverage(self):
        tasks = [
            {"type": "vzdump", "starttime": 100000, "endtime": 100100, "status": "OK"},
            {"type": "vzdump", "starttime": 100200, "endtime": 100500, "status": "WARNINGS: 1"},
            # The night before failed, but it's an older round.
            {"type": "vzdump", "starttime": 13600, "endtime": 13700, "status": "job errors"},
            {"type": "qmstart", "starttime": 100300, "endtime": 100301, "status": "OK"},
        ]
        jobs = [{"enabled": 1, "all": 1, "exclude": "107,151"}]
        guests = [{"vmid": v} for v in (100, 107, 151, 104)] + [{"vmid": 900, "template": 1}]
        answers = {"/cluster/tasks": tasks, "/cluster/backup": jobs, "/cluster/resources": guests}
        with mock.patch.object(collect, "run", lambda args, timeout=20: json.dumps(answers[args[2]])):
            self.assertEqual(collect.backup(), {"at": 100500, "status": "warnings", "covered": 2, "total": 4})


class Security(unittest.TestCase):
    NOW = 1794300000  # 2026-11-10T09:20:00Z

    def at(self, hours_ago):
        return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(self.NOW - hours_ago * 3600))

    METRICS = json.dumps({
        "decisions": {
            "http:bruteforce": {"CAPI": {"ban": 1775}},
            "ssh:bruteforce": {"CAPI": {"ban": 453}},
            "http:scan": {"CAPI": {"ban": 476}},
            "http:crawl": {"CAPI": {"ban": 106}},
            "http:exploit": {"CAPI": {"ban": 881}},
            "crowdsecurity/http-probing": {"crowdsec": {"ban": 1, "captcha": 2}},
        },
        "lapi-bouncer": {"traefik-bouncer@172.18.0.3": {"/v1/decisions": {"GET": 15000}}},
    })

    def test_counts_blocklist_bans_attacks_and_requests_without_any_ip(self):
        alerts = ("id,scope,value,reason,country,as,decisions,created_at,kind\n"
                  f'7,Ip,203.0.113.9,crowdsecurity/http-probing,US,"Example, Inc.",ban:1,{self.at(0.5)},crowdsec\n'
                  f"8,Ip,198.51.100.4,crowdsecurity/http-cve-2021-41773,DE,AS1,ban:1,{self.at(2.5)},crowdsec\n"
                  f"9,Ip,198.51.100.5,crowdsecurity/http-generic-bf,DE,AS1,ban:1,{self.at(2.2)},crowdsec\n"
                  f"10,Ip,198.51.100.6,crowdsecurity/http-crawl-non_statics,FR,AS2,ban:1,{self.at(30)},crowdsec\n")
        metrics = [self.METRICS]

        def in_guest(kind, vmid, script, timeout=20):
            return metrics[0] if "metrics" in script else alerts

        state = {}
        with mock.patch.object(collect, "in_guest", in_guest):
            first = collect.security({"vm": 150}, self.NOW, state)
            metrics[0] = self.METRICS.replace("15000", "15120")
            result = collect.security({"vm": 150}, self.NOW + 300, state)
        self.assertEqual(first["checked24h"], 0)  # the first run only learns the counter
        self.assertEqual(result["checked24h"], 120)
        self.assertEqual(result["checkedHourly"][23], 120)
        self.assertEqual(result["blocklist"], {"total": 3691, "byKind": {
            "bruteforce": 2228, "probing": 476, "crawler": 106, "exploit": 881}})
        self.assertEqual(result["bans"], 1)  # captchas aren't bans
        self.assertEqual(result["attacks24h"], 3)  # the 30h-old alert is out of the window
        self.assertEqual(result["byKind"], {"probing": 1, "exploit": 1, "bruteforce": 1})
        self.assertEqual(result["hourly"][23], 1)
        self.assertEqual(result["hourly"][21], 2)
        text = json.dumps(result)
        for leak in ("203.0.113", "198.51.100", "Example", "US", "crowdsecurity", "cve", "traefik"):
            self.assertNotIn(leak, text)

    def test_backfills_the_trend_once_from_the_access_log(self):
        def hour(h_ago):
            return time.strftime("%d/%b/%Y:%H", time.gmtime(self.NOW - h_ago * 3600))
        counts = f"  12 {hour(0)}\n 300 {hour(5)}\n 999 {hour(30)}\n   7 garbage\n"
        calls = []

        def in_guest(kind, vmid, script, timeout=20):
            calls.append(script)
            if "uniq -c" in script:
                return counts
            return self.METRICS if "metrics" in script else ""

        state = {}
        with mock.patch.object(collect, "in_guest", in_guest):
            result = collect.security({"vm": 150, "log": "/x/access.log"}, self.NOW, state)
            collect.security({"vm": 150, "log": "/x/access.log"}, self.NOW + 300, state)
        self.assertEqual(result["checkedHourly"][23], 12)
        self.assertEqual(result["checkedHourly"][18], 300)
        self.assertEqual(result["checked24h"], 312)  # the 30h-old hour is outside
        self.assertEqual(sum("uniq -c" in c for c in calls), 1)  # only once

    def test_a_restarted_counter_counts_from_zero(self):
        state = {"security": {"checked": 5000, "hours": {}}}
        with mock.patch.object(collect, "in_guest",
                               lambda k, v, script, timeout=20: self.METRICS.replace("15000", "40") if "metrics" in script else ""):
            result = collect.security({"vm": 150}, self.NOW, state)
        self.assertEqual(result["checked24h"], 40)

    def test_unreachable_crowdsec_is_left_out(self):
        with mock.patch.object(collect, "in_guest", lambda *a, **k: None):
            self.assertIsNone(collect.security({"vm": 150}, self.NOW, {}))


class Logs(unittest.TestCase):
    def test_first_run_only_learns_the_size_then_counts_new_lines(self):
        calls = []

        def in_guest(kind, vmid, script, timeout=20):
            calls.append(script)
            return "5000\n" if script.startswith("stat") else "5300\n12 1\n"

        state = {}
        with mock.patch.object(collect, "in_guest", in_guest):
            self.assertIsNone(collect.edge({"vm": 150, "log": "/x.log"}, state, 1000))
            self.assertEqual(state["edge"]["offset"], 5000)
            self.assertTrue(calls[0].startswith("stat"))  # nothing read on the first run
            result = collect.edge({"vm": 150, "log": "/x.log"}, state, 1060)
        self.assertEqual(result, {"rpm": 12.0, "errPct": 8.3})
        self.assertIn("o=5000", calls[1])


if __name__ == "__main__":
    result = unittest.main(exit=False, verbosity=0, argv=[sys.argv[0]]).result
    sys.exit(0 if result.wasSuccessful() else 1)
