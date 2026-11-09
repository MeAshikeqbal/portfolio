/**
 * One-off: move contact-form submissions out of the PUBLIC `production` dataset into the
 * PRIVATE `inbox` dataset, then delete the public copies.
 *
 *   npx sanity login                     # once
 *   npx sanity exec scripts/move-contacts-to-inbox.ts --with-user-token            # dry run
 *   npx sanity exec scripts/move-contacts-to-inbox.ts --with-user-token -- --execute
 *
 * Safe to re-run: message ids are derived from the original ids (createOrReplace), and the
 * originals are only deleted after every one of them is confirmed in the inbox.
 * Prints ids and counts only, never names, emails or messages.
 */
import { getCliClient } from "sanity/cli"
import { buildMessageDocument } from "../lib/inbox-message"

const execute = process.argv.includes("--execute")
const inboxName = process.env.SANITY_INBOX_DATASET || "inbox"

const production = getCliClient({ apiVersion: "2026-11-01" })
const inbox = production.withConfig({ dataset: inboxName })

interface ContactDoc {
  _id: string
  _createdAt: string
  name?: string
  email?: string
  message?: string
}

async function main() {
  const datasets = await production.datasets.list()
  const target = datasets.find((d) => d.name === inboxName)
  if (!target) throw new Error(`Dataset "${inboxName}" doesn't exist. Create it (private) first.`)
  if (target.aclMode !== "private") {
    throw new Error(`Dataset "${inboxName}" is ${target.aclMode}; it must be private. Aborting.`)
  }

  const contacts = await production.fetch<ContactDoc[]>(
    `*[_type == "contact"]{ _id, _createdAt, name, email, message }`,
    {},
    { perspective: "raw" },
  )
  console.log(`Found ${contacts.length} contact document(s) in "${production.config().dataset}".`)
  if (contacts.length === 0) return

  const messages = contacts.map((doc) =>
    buildMessageDocument(
      { name: doc.name ?? "", email: doc.email ?? "", message: doc.message ?? "" },
      { id: `migrated-${doc._id.replace(/^drafts\./, "")}`, now: new Date(doc._createdAt) },
    ),
  )
  for (const [i, doc] of contacts.entries())
    console.log(`  ${doc._id}  →  ${inboxName}:${messages[i]._id}`)

  if (!execute) {
    console.log(
      `\nDry run: nothing written. Re-run with "-- --execute" to copy, verify and delete.`,
    )
    return
  }

  const copy = inbox.transaction()
  for (const message of messages) copy.createOrReplace(message)
  await copy.commit({ visibility: "sync" })

  const ids = messages.map((m) => m._id)
  const confirmed = await inbox.fetch<number>(`count(*[_id in $ids])`, { ids })
  if (confirmed !== messages.length) {
    throw new Error(
      `Only ${confirmed}/${messages.length} confirmed in "${inboxName}". Nothing deleted.`,
    )
  }
  console.log(`Copied and confirmed ${confirmed} message(s) in "${inboxName}".`)

  const remove = production.transaction()
  for (const doc of contacts) remove.delete(doc._id)
  await remove.commit({ visibility: "sync" })

  const left = await production.fetch<number>(
    `count(*[_type == "contact"])`,
    {},
    { perspective: "raw" },
  )
  console.log(`Deleted the public copies. Contact documents left in production: ${left}.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
