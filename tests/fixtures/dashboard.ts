import type { Status } from "@/lib/status"

/**
 * Static data for the /styleguide composition mockup (and future visual tests).
 * Shaped like the real Sanity results so Phase 4 can swap in live data.
 */
export const fixtureProjects: {
  name: string
  description: string
  status: { status: Status; label: string }
  language: string
  stars: number
  pushed: string
  weeklyCommits: number[]
}[] = [
  {
    name: "arogify",
    description: "Blog platform built with Next.js and Sanity.",
    status: { status: "up", label: "live" },
    language: "TypeScript",
    stars: 12,
    pushed: "3d ago",
    weeklyCommits: [2, 4, 3, 8, 5, 9, 12, 7, 10, 6, 11, 14],
  },
  {
    name: "mc-status-page",
    description: "Uptime and player status page for a Minecraft server.",
    status: { status: "info", label: "maintained" },
    language: "Go",
    stars: 31,
    pushed: "2w ago",
    weeklyCommits: [6, 5, 7, 4, 3, 5, 2, 3, 1, 2, 2, 1],
  },
  {
    name: "bluebox",
    description: "Self-hosted media and backup box configuration.",
    status: { status: "idle", label: "archived" },
    language: "Shell",
    stars: 4,
    pushed: "8mo ago",
    weeklyCommits: [0, 1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
  },
]

export const fixturePosts = [
  { title: "Why I started self-hosting AI at home", date: "2026-03-14", tags: ["homelab", "ai"] },
  { title: "The ethics of AI: keeping it used for good", date: "2025-11-02", tags: ["ai"] },
  { title: "The future of quantum computing", date: "2025-08-21", tags: ["quantum"] },
]

export const fixtureTimeline = [
  {
    year: "2026",
    title: "Specialist Business Consultant in IT",
    org: "Chelson Gordon Consultancy",
    status: "up" as Status,
  },
  { year: "2024", title: "B.Tech, Computer Science", org: "University", status: "idle" as Status },
]

export const fixtureSkills = [
  { name: "Next.js", icon: "logos:nextjs-icon" },
  { name: "TypeScript", icon: "logos:typescript-icon" },
  { name: "Docker", icon: "logos:docker-icon" },
  { name: "Kubernetes", icon: "logos:kubernetes" },
  { name: "Proxmox", icon: "simple-icons:proxmox" },
  { name: "WireGuard", icon: "simple-icons:wireguard" },
  { name: "Grafana", icon: "logos:grafana" },
  { name: "API Security", icon: "mdi:security" },
]
