/**
 * Publishes the /uses and /now singletons from scripts/about-content.data.ts.
 *
 *   npx sanity exec scripts/about-content.ts --with-user-token                 # dry run
 *   npx sanity exec scripts/about-content.ts --with-user-token -- --execute    # publish
 *
 * Revision-aware, so it never overwrites edits it hasn't seen:
 * - The dry run validates the content, prints it, and records the current `_rev` of `uses`,
 *   `now` and their drafts plus a hash of the content in scripts/.about-content.snapshot.json.
 * - --execute re-reads those revisions and refuses if anything changed since the dry run
 *   (a Studio edit, or a data edit that skipped a dry run). It also refuses while the data
 *   file still has `// REVIEW:` comments.
 * - Missing documents are created with `create`, which fails atomically if one appeared in
 *   the meantime. Existing documents are left alone unless --force, and then patched with
 *   `ifRevisionId`, so a concurrent edit aborts the whole transaction.
 * - Drafts would shadow the new content in the Studio: the run stops unless
 *   --discard-drafts, which deletes them in the same transaction (revision-checked too).
 */
import { createHash } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { getCliClient } from "sanity/cli"

import { NOW, USES } from "./about-content.data"
import { HOMELAB_ITEMS, validateAboutContent } from "./about-content.validate"

const args = new Set(process.argv.slice(2))
const execute = args.has("--execute")
const force = args.has("--force")
const discardDrafts = args.has("--discard-drafts")

const DATA_FILE = path.join(process.cwd(), "scripts/about-content.data.ts")
const SNAPSHOT_FILE = path.join(process.cwd(), "scripts/.about-content.snapshot.json")
const IDS = ["uses", "now", "drafts.uses", "drafts.now"] as const
type Id = (typeof IDS)[number]
type Revisions = Record<Id, string | null>

interface Snapshot {
  takenAt: string
  contentHash: string
  revisions: Revisions
}

const client = getCliClient({ apiVersion: "2026-11-01", useCdn: false, perspective: "raw" })

const contentHash = createHash("sha256").update(JSON.stringify({ USES, NOW })).digest("hex")

async function currentRevisions(): Promise<Revisions> {
  const docs = await client.fetch<{ _id: Id; _rev: string }[]>(`*[_id in $ids]{ _id, _rev }`, {
    ids: [...IDS],
  })
  return Object.fromEntries(
    IDS.map((id) => [id, docs.find((doc) => doc._id === id)?._rev ?? null]),
  ) as Revisions
}

function printContent() {
  console.log(`\n/uses  intro: ${USES.intro}`)
  USES.sections.forEach((section, index) => {
    console.log(`\n  ## ${section.title}`)
    section.items.forEach((item, i) => {
      const hero = index === 0 && i < HOMELAB_ITEMS ? " [hero]" : ""
      const length = item.description ? ` (${item.description.length})` : ""
      console.log(
        `  - ${item.name}${hero}: ${item.description ?? "—"}${length}  ${item.icon ?? ""}`,
      )
    })
  })
  console.log(`\n/now  location: ${NOW.location}`)
  for (const block of NOW.body) console.log(`  ${block.children.map((c) => c.text).join("")}`)
}

async function main() {
  console.log(execute ? "EXECUTING" : "DRY RUN (pass -- --execute to publish)")

  const problems = await validateAboutContent({ uses: USES, now: NOW })
  if (problems.length > 0) {
    console.error(`\nContent problems:\n${problems.map((p) => `  - ${p}`).join("\n")}`)
    process.exit(1)
  }

  const reviews = readFileSync(DATA_FILE, "utf8").match(/^\s*\/\/\s*REVIEW:.*$/gm) ?? []
  const revisions = await currentRevisions()

  if (!execute) {
    printContent()
    console.log("\nCurrent revisions:", revisions)
    if (reviews.length > 0) {
      console.log(`\n${reviews.length} REVIEW comment(s) to resolve before --execute:`)
      for (const line of reviews) console.log(`  ${line.trim()}`)
    }
    const snapshot: Snapshot = { takenAt: new Date().toISOString(), contentHash, revisions }
    writeFileSync(SNAPSHOT_FILE, `${JSON.stringify(snapshot, null, 2)}\n`)
    console.log(`\nSnapshot written to ${path.relative(process.cwd(), SNAPSHOT_FILE)}.`)
    return
  }

  // --- execute -------------------------------------------------------------------------
  if (reviews.length > 0) {
    throw new Error(`Resolve the ${reviews.length} REVIEW comment(s) in the data file first.`)
  }
  if (!existsSync(SNAPSHOT_FILE)) throw new Error("No snapshot: run the dry run first.")
  const snapshot = JSON.parse(readFileSync(SNAPSHOT_FILE, "utf8")) as Snapshot
  if (snapshot.contentHash !== contentHash) {
    throw new Error("The content changed since the dry run: run the dry run again and review it.")
  }
  const changed = IDS.filter((id) => snapshot.revisions[id] !== revisions[id])
  if (changed.length > 0) {
    throw new Error(
      `Changed in Sanity since the dry run: ${changed.join(", ")}. Run the dry run again.`,
    )
  }

  const tx = client.transaction()

  for (const draftId of ["drafts.uses", "drafts.now"] as const) {
    const rev = revisions[draftId]
    if (!rev) continue
    if (!discardDrafts) {
      throw new Error(`${draftId} exists and would shadow this content: pass --discard-drafts.`)
    }
    // A no-op patch pins the draft's revision; the delete only lands if it still matches.
    tx.patch(draftId, (p) => p.ifRevisionId(rev).unset(["__aboutContentRevisionCheck"]))
    tx.delete(draftId)
    console.log(`discard  ${draftId} (rev ${rev})`)
  }

  const docs: { _id: "uses" | "now"; _type: string; fields: Record<string, unknown> }[] = [
    { _id: "uses", _type: "uses", fields: USES },
    { _id: "now", _type: "now", fields: NOW },
  ]
  for (const { _id, _type, fields } of docs) {
    const rev = revisions[_id]
    if (!rev) {
      tx.create({ _id, _type, ...fields })
      console.log(`create   ${_id}`)
    } else if (force) {
      tx.patch(_id, (p) => p.ifRevisionId(rev).set({ ...fields }))
      console.log(`replace  ${_id} (rev ${rev})`)
    } else {
      throw new Error(`${_id} is already published (rev ${rev}); pass --force to replace it.`)
    }
  }

  const result = await tx.commit()
  console.log(`\ncommitted transaction ${result.transactionId}`)
  console.log("new revisions:", await currentRevisions())
}

// Top-level await: `sanity exec` tears its module loader down once the top level finishes,
// and the icon check still loads icon sets lazily after that.
try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
