/**
 * One-off: delete documents of types the Studio no longer has (left over from an old schema),
 * so nothing invisible lingers in the public dataset.
 *
 *   npm run backup                                                           # first!
 *   npx sanity exec scripts/delete-orphans.ts --with-user-token              # dry run
 *   npx sanity exec scripts/delete-orphans.ts --with-user-token -- --execute
 *
 * Refuses to delete anything another document still references.
 */
import { getCliClient } from "sanity/cli"

const ORPHAN_TYPES = ["blogs", "works", "abouts"]

const execute = process.argv.includes("--execute")
const client = getCliClient({ apiVersion: "2026-11-01" })

interface Orphan {
  _id: string
  _type: string
  label?: string
  referencedBy: number
}

async function main() {
  const orphans = await client.fetch<Orphan[]>(
    `*[_type in $types]{
      _id, _type,
      "label": coalesce(title, name, _id),
      "referencedBy": count(*[references(^._id) && !(_type in $types)])
    }`,
    { types: ORPHAN_TYPES },
    { perspective: "raw" },
  )

  for (const type of ORPHAN_TYPES) {
    const ofType = orphans.filter((doc) => doc._type === type)
    console.log(`${type}: ${ofType.length}`)
    for (const doc of ofType) console.log(`  ${doc._id}  ${doc.label}`)
  }
  if (orphans.length === 0) return

  const referenced = orphans.filter((doc) => doc.referencedBy > 0)
  if (referenced.length) {
    throw new Error(
      `Still referenced, nothing deleted: ${referenced.map((doc) => doc._id).join(", ")}`,
    )
  }

  if (!execute) {
    console.log(`\nDry run: nothing deleted. Back up, then re-run with "-- --execute".`)
    return
  }
  const tx = client.transaction()
  for (const doc of orphans) tx.delete(doc._id)
  await tx.commit({ visibility: "sync" })

  const left = await client.fetch<number>(
    `count(*[_type in $types])`,
    { types: ORPHAN_TYPES },
    { perspective: "raw" },
  )
  console.log(`\nDeleted ${orphans.length} document(s). Left: ${left}.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
