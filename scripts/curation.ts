/**
 * One-off content curation from the 2026-11 critique (owner-approved choices):
 * - archive 9 generic 2022–24 essays (pages stay, noindex, out of every list), keeping the
 *   three practitioner posts: MFA, building a site with a JS framework, .zip/.mov domains;
 * - lead "Infrastructure & homelab" with what actually runs in the lab, by giving those skills
 *   the lowest orderRank (the inventory shows the first eight of each group).
 *
 *   npx sanity exec scripts/curation.ts --with-user-token                 # dry run
 *   npx sanity exec scripts/curation.ts --with-user-token -- --execute    # apply
 *
 * Revision-aware like scripts/about-content.ts: the dry run snapshots every touched
 * document's `_rev` (and a hash of this plan) in scripts/.curation.snapshot.json; --execute
 * refuses if any of them changed since, and patches with `ifRevisionId`, so a concurrent Studio
 * edit aborts the whole transaction. Documents with an unpublished draft are refused (the
 * draft would keep the old value and win in the Studio).
 */
import { createHash } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { getCliClient } from "sanity/cli"

/** Exact titles to archive. */
const ARCHIVE = [
  "An introduction to Blockchain technology and its potential use cases",
  "Unleashing the Future: Exploring the Latest Tech Innovations",
  "The Ethics of AI: How to Ensure That Artificial Intelligence Is Used for Good",
  "The Future of Quantum Computing: What to Expect",
  "Exploring the Future of Virtual Reality: Current Developments and Potential Applications",
  "Revolutionizing Industries: The Impact of IoT",
  "The Benefits of Edge Computing for Real-Time Applications",
  "Evolution and Future of AI: A Comprehensive Overview",
  "Understanding Cybersecurity: Essential Strategies",
]

/** Skills to lead their inventory group, in this order. */
const LEAD_SKILLS = [
  "Proxmox VE",
  "LXC",
  "Docker",
  "Traefik",
  "Tailscale",
  "WireGuard",
  "Linux",
  "Cloudflare",
]

/** LexoRank-style ranks below every existing one ("0|1…"), ascending in LEAD_SKILLS order. */
const leadRank = (index: number) => `0|0000${String.fromCharCode(97 + index)}0:`

const execute = process.argv.includes("--execute")
const SNAPSHOT = path.join(process.cwd(), "scripts/.curation.snapshot.json")
const client = getCliClient({ apiVersion: "2026-11-01", useCdn: false, perspective: "raw" })
const planHash = createHash("sha256").update(JSON.stringify({ ARCHIVE, LEAD_SKILLS })).digest("hex")

interface Doc {
  _id: string
  _rev: string
  title?: string
  name?: string
  archived?: boolean | null
  orderRank?: string | null
}

const published = `!(_id in path("drafts.**")) && !(_id in path("versions.**"))`

async function load() {
  const [posts, skills] = await Promise.all([
    client.fetch<Doc[]>(
      `*[_type == "post" && ${published} && title in $titles]{ _id, _rev, title, archived }`,
      { titles: ARCHIVE },
    ),
    client.fetch<Doc[]>(
      `*[_type == "skills" && ${published} && name in $names]{ _id, _rev, name, orderRank }`,
      { names: LEAD_SKILLS },
    ),
  ])
  const archive = ARCHIVE.map((title) => {
    const doc = posts.find((p) => p.title === title)
    if (!doc) throw new Error(`Post not found (exact title): ${title}`)
    return doc
  })
  const lead = LEAD_SKILLS.map((name) => {
    const doc = skills.find((s) => s.name === name)
    if (!doc) throw new Error(`Skill not found (exact name): ${name}`)
    return doc
  })
  const ids = [...archive, ...lead].map((d) => d._id)
  const drafts = await client.fetch<string[]>(`*[_id in $ids]._id`, {
    ids: ids.map((id) => `drafts.${id}`),
  })
  return { archive, lead, drafts }
}

async function main() {
  console.log(execute ? "EXECUTING" : "DRY RUN (pass -- --execute to apply)")
  const { archive, lead, drafts } = await load()

  console.log("\nArchive (page stays, noindex; leaves home, /post, RSS, sitemap, palette):")
  for (const doc of archive) {
    console.log(`  ${doc.archived ? "(already)" : "archive  "} ${doc.title}`)
  }
  console.log("\nLead 'Infrastructure & homelab' (new orderRank):")
  lead.forEach((doc, i) => console.log(`  ${doc.name}: ${doc.orderRank ?? "—"} -> ${leadRank(i)}`))
  if (drafts.length > 0) {
    console.log(`\nUnpublished drafts on ${drafts.join(", ")}: publish or discard them first.`)
  }

  const revisions = Object.fromEntries([...archive, ...lead].map((d) => [d._id, d._rev]))
  if (!execute) {
    writeFileSync(SNAPSHOT, `${JSON.stringify({ planHash, revisions }, null, 2)}\n`)
    console.log(`\nSnapshot written to ${path.relative(process.cwd(), SNAPSHOT)}.`)
    return
  }

  if (drafts.length > 0) throw new Error("Refusing: touched documents have unpublished drafts.")
  if (!existsSync(SNAPSHOT)) throw new Error("No snapshot: run the dry run first.")
  const snapshot = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as {
    planHash: string
    revisions: Record<string, string>
  }
  if (snapshot.planHash !== planHash) throw new Error("The plan changed: run the dry run again.")
  const changed = Object.keys(revisions).filter((id) => snapshot.revisions[id] !== revisions[id])
  if (changed.length > 0) {
    throw new Error(`Changed since the dry run: ${changed.join(", ")}. Run the dry run again.`)
  }

  const tx = client.transaction()
  for (const doc of archive) {
    if (!doc.archived) tx.patch(doc._id, (p) => p.ifRevisionId(doc._rev).set({ archived: true }))
  }
  lead.forEach((doc, i) =>
    tx.patch(doc._id, (p) => p.ifRevisionId(doc._rev).set({ orderRank: leadRank(i) })),
  )
  const result = await tx.commit()
  console.log(`\ncommitted transaction ${result.transactionId}`)
}

// Top-level await: `sanity exec` tears its module loader down once the top level finishes.
try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
