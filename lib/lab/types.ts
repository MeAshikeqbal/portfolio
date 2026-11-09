/**
 * The homelab heartbeat, as the site stores and serves it. Shared by server and client, so
 * types and pure helpers only. Every field is public: the lab sends public machine names
 * (the /uses "Homelab" row names), never hostnames or addresses.
 */

export interface LabNode {
  /** Public name, matching a /uses Homelab row ("Tower", "Mini PC #1"). */
  name: string
  online: boolean
  /** Seconds since boot, as Proxmox reports it; 0 when offline. */
  uptime: number
}

export interface LabStatus {
  nodes: LabNode[]
  /** When the site received the heartbeat (server clock, ISO). Freshness is judged from this. */
  receivedAt: string
}
