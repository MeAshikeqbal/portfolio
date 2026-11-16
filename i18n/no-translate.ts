/**
 * Names machine translation must leave alone: product, service and personal names that read
 * as ordinary words to a translator ("Homecave" → "Heimhöhle"). Both translation pipelines (UI
 * messages and Sanity content) wrap each occurrence so Google copies it verbatim.
 */
export const NO_TRANSLATE = [
  "Ashik Eqbal",
  "itsashik.dev",
  "Homecave",
  "Homelab",
  "homelab",
  "Proxmox Backup Server",
  "Proxmox",
  "Jellyfin",
  "Spotify",
  "Trakt",
  "TMDB",
  "GitHub",
  "Sanity",
  "Cloudflare Turnstile",
  "Turnstile",
  "RSS",
  "PGP",
  "ZFS",
  "zfs",
  "VRAM",
  "vram",
  "GPU",
  "gpu",
  "CPU",
  "cpu",
  "DNS",
  "dns",
  "README",
  "PNG",
  "Derek Sivers",
] as const
