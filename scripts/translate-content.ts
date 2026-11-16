/**
 * Machine-translates published Sanity content into every other locale: the backfill for content
 * published before translation existed, and a way to redo it. New publishes are translated by
 * the Sanity webhook (app/api/sanity-webhook).
 *
 *   npx sanity exec scripts/translate-content.ts --with-user-token                 # dry run
 *   npx sanity exec scripts/translate-content.ts --with-user-token -- --execute    # translate
 *     -- --type post        only one document type
 *     -- --id <document id> only one document
 *     -- --lang ja          only one language
 *     -- --force            translate again, ignoring the memory and unchanged revisions
 *
 * The dry run prints how many characters each document would send and roughly what that
 * costs. Also removes translations whose source document is gone. Needs
 * GOOGLE_TRANSLATE_API_KEY (environment or .env.local).
 */
import nextEnv from "@next/env"
import { getCliClient } from "sanity/cli"
import { allLocales, isLocale, locales, type Locale } from "../i18n/locales"
import { TRANSLATABLE_TYPES } from "../lib/translate/types"
import { translateDocument, type TranslationClient } from "../lib/translate/document"

nextEnv.loadEnvConfig(process.cwd())

const USD_PER_MILLION_CHARS = 20
const args = process.argv.slice(2)
const flag = (name: string) => args.includes(`--${name}`)
const option = (name: string) => (flag(name) ? args[args.indexOf(`--${name}`) + 1] : undefined)

const execute = flag("execute")
const force = flag("force")
const type = option("type")
const only = option("id")
const lang = option("lang")

if (type && !(TRANSLATABLE_TYPES as readonly string[]).includes(type)) {
  throw new Error(`--type must be one of ${TRANSLATABLE_TYPES.join(", ")}`)
}
if (lang && !isLocale(lang) && !(allLocales as readonly string[]).includes(lang)) {
  throw new Error(`Unknown locale "${lang}"`)
}

// The languages the site serves (i18n/locales.ts), unless one is named.
const targets = (lang ? [lang as Locale] : locales).filter((l) => l !== "en")
const client = getCliClient({ apiVersion: "2026-11-01", useCdn: false, perspective: "raw" })

async function main() {
  if (targets.length === 0) {
    console.log("No languages to translate into: only English is served (i18n/locales.ts).")
    return
  }
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY ?? ""
  if (execute && !apiKey) throw new Error("GOOGLE_TRANSLATE_API_KEY is not set")

  const ids = await client.fetch<string[]>(
    `*[_type in $types && !(_id in path("drafts.**")) && !(_id in path("versions.**"))
      ${only ? "&& _id == $only" : ""}]._id`,
    { types: type ? [type] : TRANSLATABLE_TYPES, only: only ?? "" },
  )
  console.log(
    `${execute ? "TRANSLATING" : "DRY RUN (pass -- --execute to translate)"}: ${ids.length} documents into ${targets.join(", ")}`,
  )

  let total = 0
  for (const id of ids) {
    const result = await translateDocument(id, {
      client: client as unknown as TranslationClient,
      apiKey,
      locales: targets,
      force,
      dryRun: !execute,
      maxChars: Number(process.env.TRANSLATE_MAX_CHARS) || undefined,
    })
    if (result.status === "skipped") continue
    const chars = result.locales.reduce((sum, r) => sum + r.chars, 0)
    total += chars
    const states = result.locales.map((r) => `${r.locale}:${r.status}`).join(" ")
    const note = result.status === "aborted" ? `  ! ${result.reason}` : ""
    console.log(`${id.padEnd(40)} ${String(chars).padStart(7)} chars  ${states}${note}`)
  }
  const cost = (total / 1_000_000) * USD_PER_MILLION_CHARS
  console.log(
    `${execute ? "Sent" : "Would send"} ${total} characters (≈ $${cost.toFixed(2)} past the free tier)`,
  )

  // Translations of documents that were deleted or unpublished.
  const orphans = await client.fetch<string[]>(
    `*[_type == "translation" && !defined(*[_id == ^.source._ref][0])]._id`,
  )
  if (orphans.length > 0) {
    console.log(`${execute ? "Removing" : "Would remove"} ${orphans.length} orphaned translations`)
    if (execute) {
      const tx = client.transaction()
      for (const orphan of orphans) tx.delete(orphan)
      await tx.commit()
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
