#!/bin/sh
# Homelab heartbeat for itsashik.dev: reads node state from the local Proxmox API with a
# read-only token, keeps only nodes mapped to public names, signs the JSON and POSTs it to
# the site. The site never connects to the lab. Run every 5 minutes (lab-heartbeat.timer).
#
# Config (/etc/lab-heartbeat.env, mode 600):
#   PVE_TOKEN_ID=heartbeat@pve!site          read-only (PVEAuditor) API token id
#   PVE_TOKEN_SECRET=…                        its secret
#   LAB_HEARTBEAT_SECRET=…                    shared with Vercel's LAB_HEARTBEAT_SECRET
#   LAB_HEARTBEAT_URL=https://www.itsashik.dev/api/lab-heartbeat
#   NODE_NAMES="pve=Tower,pve-1=Mini PC #1,pve-2=Mini PC #2"   hostname=public name
#   PVE_API_URL=https://localhost:8006        optional
#   PVE_CA=/etc/pve/pve-root-ca.pem           optional
set -eu

: "${PVE_TOKEN_ID:?}" "${PVE_TOKEN_SECRET:?}" "${LAB_HEARTBEAT_SECRET:?}" "${LAB_HEARTBEAT_URL:?}" "${NODE_NAMES:?}"
PVE_API_URL="${PVE_API_URL:-https://localhost:8006}"
PVE_CA="${PVE_CA:-/etc/pve/pve-root-ca.pem}"

if [ "${PVE_API_URL#http://}" != "$PVE_API_URL" ]; then
  tls=""            # plain http only for local testing
else
  tls="--cacert $PVE_CA"
fi

# shellcheck disable=SC2086
resources=$(curl -fsS --max-time 10 $tls \
  -H "Authorization: PVEAPIToken=${PVE_TOKEN_ID}=${PVE_TOKEN_SECRET}" \
  "${PVE_API_URL}/api2/json/cluster/resources?type=node")

# Only mapped nodes leave the lab, under their public names; nothing else from the API does.
body=$(printf '%s' "$resources" | NODE_NAMES="$NODE_NAMES" python3 -c '
import json, os, sys
names = dict(pair.split("=", 1) for pair in os.environ["NODE_NAMES"].split(",") if "=" in pair)
nodes = []
for r in json.load(sys.stdin).get("data", []):
    public = names.get(r.get("node"))
    if not public:
        continue
    online = r.get("status") == "online"
    nodes.append({"name": public, "online": online, "uptime": int(r.get("uptime") or 0) if online else 0})
nodes.sort(key=lambda n: n["name"])
print(json.dumps({"nodes": nodes}, separators=(",", ":")))
')

ts=$(date +%s)
sig=$(printf '%s.%s' "$ts" "$body" | openssl dgst -sha256 -hmac "$LAB_HEARTBEAT_SECRET" -r | cut -d' ' -f1)

curl -fsS --max-time 15 -X POST \
  -H "content-type: application/json" \
  -H "x-lab-timestamp: $ts" \
  -H "x-lab-signature: $sig" \
  --data-binary "$body" \
  "$LAB_HEARTBEAT_URL"
