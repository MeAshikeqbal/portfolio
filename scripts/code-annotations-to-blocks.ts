/**
 * One-off: convert the old inline `code` annotations in posts and projects into code blocks.
 *
 *   npx sanity exec scripts/code-annotations-to-blocks.ts --with-user-token            # dry run
 *   npx sanity exec scripts/code-annotations-to-blocks.ts --with-user-token -- --execute
 *
 * Run it after the site that renders `code` blocks is deployed (the old site only renders the
 * annotation). Patches published documents and any open drafts alike; each patch is guarded
 * by the document's revision, so a concurrent edit makes it fail rather than be overwritten.
 */
import { getCliClient } from "sanity/cli"
import { convertCodeAnnotations } from "../sanity/migrations/code-annotations"

const execute = process.argv.includes("--execute")
const client = getCliClient({ apiVersion: "2026-11-01" })

interface Doc {
  _id: string
  _rev: string
  title?: string
  body: { _key: string; _type: string; [key: string]: unknown }[]
}

async function main() {
  const docs = await client.fetch<Doc[]>(
    `*[defined(body) && count(body[_type == "block" && count(markDefs[_type == "code"]) > 0]) > 0]{
      _id, _rev, title, body
    }`,
    {},
    { perspective: "raw" },
  )
  console.log(`Found ${docs.length} document(s) with code annotations.`)
  if (docs.length === 0) return

  const tx = client.transaction()
  let patches = 0
  for (const doc of docs) {
    const { body, converted, skippedListItems } = convertCodeAnnotations(doc.body)
    if (skippedListItems.length) {
      console.log(
        `  ${doc._id}: left ${skippedListItems.length} list item(s) as they are, convert by hand: ${skippedListItems.join(", ")}`,
      )
    }
    if (converted === 0) continue
    const blocks = body.filter((item) => item._type === "code").length
    console.log(
      `  ${doc._id}  "${doc.title ?? ""}": ${converted} paragraph(s) → ${blocks} code block(s)`,
    )
    tx.patch(doc._id, (patch) => patch.ifRevisionId(doc._rev).set({ body }))
    patches++
  }

  if (patches === 0) return
  if (!execute) {
    console.log(`\nDry run: nothing written. Re-run with "-- --execute" to apply.`)
    return
  }
  await tx.commit({ visibility: "sync" })

  const left = await client.fetch<number>(
    `count(*[count(body[_type == "block" && count(markDefs[_type == "code"]) > 0]) > 0])`,
    {},
    { perspective: "raw" },
  )
  console.log(`Done. Documents still using the annotation: ${left}.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
