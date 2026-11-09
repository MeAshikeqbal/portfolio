/**
 * One-off: give projects and skills an `orderRank` (used by drag-and-drop ordering in the
 * Studio) that matches the order the site shows today: projects as listed now, skills A–Z.
 *
 *   npx sanity exec scripts/seed-order-rank.ts --with-user-token            # dry run
 *   npx sanity exec scripts/seed-order-rank.ts --with-user-token -- --execute
 *
 * Only fills documents that have no rank yet, so it's safe to re-run. Drafts get the same rank
 * as their published document.
 */
import { getCliClient } from "sanity/cli"
import { rankSequence } from "../sanity/migrations/order-rank"

const execute = process.argv.includes("--execute")
const client = getCliClient({ apiVersion: "2026-11-01" })

const SOURCES = {
  project: `*[_type == "project" && !(_id in path("drafts.**"))]
    | order(coalesce(order, 999) asc, _createdAt desc){ _id, "label": title, orderRank }`,
  skills: `*[_type == "skills" && !(_id in path("drafts.**"))]
    | order(lower(name) asc){ _id, "label": name, orderRank }`,
}

interface Doc {
  _id: string
  label?: string
  orderRank?: string
}

async function main() {
  const tx = client.transaction()
  let changes = 0

  for (const [type, query] of Object.entries(SOURCES)) {
    const docs = await client.fetch<Doc[]>(query, {}, { perspective: "raw" })
    if (docs.some((doc) => doc.orderRank)) {
      console.log(`${type}: some documents are already ranked; skipping (reorder in the Studio).`)
      continue
    }
    const ranks = rankSequence(docs.length)
    const draftIds = new Set(
      await client.fetch<string[]>(
        `*[_id in $ids]._id`,
        { ids: docs.map((doc) => `drafts.${doc._id}`) },
        { perspective: "raw" },
      ),
    )
    console.log(`${type}: ${docs.length} document(s)`)
    docs.forEach((doc, i) => {
      console.log(`  ${String(i + 1).padStart(3)}. ${doc.label ?? doc._id}`)
      tx.patch(doc._id, { set: { orderRank: ranks[i] } })
      if (draftIds.has(`drafts.${doc._id}`))
        tx.patch(`drafts.${doc._id}`, { set: { orderRank: ranks[i] } })
      changes++
    })
  }

  if (!execute || changes === 0) {
    if (changes) console.log(`\nDry run: nothing written. Re-run with "-- --execute" to apply.`)
    return
  }
  await tx.commit({ visibility: "sync" })
  console.log(`\nRanked ${changes} document(s).`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
