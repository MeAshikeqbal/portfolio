/**
 * Content for the /uses and /now singletons, published by scripts/about-content.ts.
 *
 * Facts come from the owner and from the live homelab (read 2026-11-09). Wording is public:
 * scripts/about-content.validate.ts rejects IPs, hostnames, ports, versions and anything else
 * that maps out the network. `_key`s are stable slugs so re-publishing doesn't churn them.
 *
 * `REVIEW:` comments mark claims the owner must confirm; --execute refuses while any remain.
 */

export interface AboutItem {
  _key: string
  _type: "usesItem"
  name: string
  description?: string
  url?: string
  icon?: string
}

export interface AboutSection {
  _key: string
  _type: "usesSection"
  title: string
  items: AboutItem[]
}

export interface AboutBlock {
  _key: string
  _type: "block"
  style: "normal"
  markDefs: { _key: string; _type: "link"; href: string }[]
  children: { _key: string; _type: "span"; text: string; marks: string[] }[]
}

function item(key: string, name: string, description: string | null, icon: string): AboutItem {
  return {
    _key: key,
    _type: "usesItem",
    name,
    ...(description ? { description } : {}),
    icon,
  }
}

function section(key: string, title: string, items: AboutItem[]): AboutSection {
  return { _key: key, _type: "usesSection", title, items }
}

/** One paragraph: a bold lead-in ("Building:") followed by plain text. */
function para(key: string, lead: string, text: string): AboutBlock {
  return {
    _key: key,
    _type: "block",
    style: "normal",
    markDefs: [],
    children: [
      { _key: `${key}-lead`, _type: "span", text: `${lead} `, marks: ["strong"] },
      { _key: `${key}-text`, _type: "span", text, marks: [] },
    ],
  }
}

export const USES = {
  intro: "The machines, software and services behind my work and my homelab.",
  sections: [
    // The hero shows the first five items of this section, so keep it to exactly five,
    // with short descriptions (the hero truncates past ~45 characters).
    section("homelab", "Homelab", [
      item(
        "proxmox-cluster",
        "Proxmox VE cluster",
        "3 nodes, mostly LXC containers, a few VMs",
        "simple-icons:proxmox",
      ),
      // 32 GB per the owner (upgrade from 16 GB in progress, 2026-11-09).
      item("tower", "Tower", "Ryzen 5 3600 · GTX 1050 Ti · 32 GB", "mdi:server"),
      item(
        "mini-pc-1",
        "Mini PC #1",
        "Network services: DNS, proxy, passwords",
        "mdi:server-network",
      ),
      item("mini-pc-2", "Mini PC #2", "Media automation and remote access", "mdi:server-network"),
      // 4 TB raw (decimal) is 3.6 TiB: units, not redundancy. Claim neither mirror nor parity.
      item("storage", "Storage", "2× 2 TB WD Purple · 3.6 TiB ZFS pool", "mdi:nas"),
    ]),
    section("self-hosted", "Self-hosted", [
      item("jellyfin", "Jellyfin", "Media server, GPU transcoding", "simple-icons:jellyfin"),
      item("frigate", "Frigate", "NVR with GPU object detection", "simple-icons:frigate"),
      item("tdarr", "Tdarr", "Re-encodes the library on the GPU to save disk", "mdi:movie-open"),
      item(
        "arr",
        "Sonarr, Radarr, Lidarr",
        "Media automation, with Prowlarr and Seerr for requests",
        "simple-icons:sonarr",
      ),
      item("homarr", "Homarr", "Dashboard for the lab", "simple-icons:homarr"),
      item(
        "vaultwarden",
        "Vaultwarden",
        "Password manager, Bitwarden-compatible",
        "simple-icons:vaultwarden",
      ),
      item("rustfs", "RustFS", "S3-compatible object storage", "simple-icons:rustfs"),
      item(
        "pbs",
        "Proxmox Backup Server",
        "Off-site backups of every container and VM",
        "mdi:backup-restore",
      ),
    ]),
    section("network", "Network & access", [
      // Worded to hold whether the 5-port Omada unit is the gateway or a switch.
      item(
        "omada",
        "TP-Link Omada",
        "Switching and Wi-Fi, run by a self-hosted controller",
        "simple-icons:tplink",
      ),
      item("traefik", "Traefik", "Reverse proxy for public services", "simple-icons:traefikproxy"),
      item(
        "npmplus",
        "NPMplus",
        "Reverse proxy for internal services",
        "simple-icons:nginxproxymanager",
      ),
      item("adguard", "AdGuard Home", "Network-wide DNS filtering", "simple-icons:adguard"),
      item("tailscale", "Tailscale", "Private remote access", "simple-icons:tailscale"),
    ]),
    section("editor", "Editor & terminal", [
      item("vscode", "VS Code", "Main editor", "logos:visual-studio-code"),
      item("zsh", "zsh", "Shell", "simple-icons:zsh"),
      item(
        "claude-code",
        "Claude Code",
        "Coding agent in the terminal and editor",
        "simple-icons:claude",
      ),
      item(
        "bazzite",
        "Bazzite",
        "Immutable Fedora Atomic desktop; dev work in containers",
        "simple-icons:fedora",
      ),
    ]),
    section("desk", "Desk", [
      item("laptop", "Laptop", "Daily driver", "mdi:laptop"),
      item("monitor", "27″ monitor", null, "mdi:monitor"),
      item("mac-mini", "Mac mini", null, "simple-icons:apple"),
      item("keyboard", "85% wireless mechanical keyboard", null, "mdi:keyboard"),
      item("mouse", "Razer Basilisk V3 X HyperSpeed", null, "simple-icons:razer"),
      item("alexa", "Alexa", null, "simple-icons:amazonalexa"),
      item("phone", "Phone", null, "mdi:cellphone"),
    ]),
    section("paid", "Services I pay for", [
      item("claude", "Claude", "Day-to-day coding and writing help", "simple-icons:claude"),
      item("registrar", "Domain registrar", "itsashik.dev", "mdi:web"),
      item("vercel", "Vercel", "Hosting for this site", "simple-icons:vercel"),
    ]),
  ] satisfies AboutSection[],
}

export const NOW = {
  location: "Kolkata, India",
  // Approved by the owner 2026-11-09. Add a "Reading:" line only once there is one.
  body: [
    para(
      "building",
      "Building:",
      "this site, rebuilt on Next.js 16 and Sanity as a homelab-style dashboard, writing first.",
    ),
    para(
      "maintaining",
      "Maintaining:",
      "mc-status-page, get-a-date, menu and Arogify alongside it.",
    ),
    para(
      "self-hosting",
      "Self-hosting:",
      "the services behind all of this, on a three-node Proxmox cluster at home.",
    ),
  ] satisfies AboutBlock[],
}
