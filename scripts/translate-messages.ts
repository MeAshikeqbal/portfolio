/**
 * Machine-translates the UI messages (messages/en.json) into every other locale with Google
 * Cloud Translation, writing messages/<locale>.json for review in the diff.
 *
 *   npm run i18n:translate                # new and changed English messages only
 *   npm run i18n:translate -- --dry-run   # what would be sent, and roughly what it costs
 *   npm run i18n:translate -- --lang ja   # one locale
 *   npm run i18n:translate -- --force     # everything again (ignores the lock)
 *
 * Needs GOOGLE_TRANSLATE_API_KEY (environment or .env.local): a key restricted to the Cloud
 * Translation API. messages/.lock.json records which English version each message was
 * translated from; messages/overrides/<locale>.json holds hand fixes, which always win and are
 * never sent to Google.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import nextEnv from "@next/env"
import { allLocales, type Locale } from "../i18n/locales"
import { translateHtml } from "../lib/translate/google"
import { prepare, rebuild, verify } from "../lib/translate/icu"
import { flatten, hashMessage, unflatten, type Flat } from "../lib/translate/messages"

const ROOT = join(__dirname, "..")
const DIR = join(ROOT, "messages")
const LOCK = join(DIR, ".lock.json")
/** Google's published price for Basic translation, after the free 500k characters a month. */
const USD_PER_MILLION_CHARS = 20

nextEnv.loadEnvConfig(ROOT)

const args = process.argv.slice(2)
const dryRun = args.includes("--dry-run")
const force = args.includes("--force")
const only = args.includes("--lang") ? args[args.indexOf("--lang") + 1] : null
const targets = allLocales.filter((l) => l !== "en" && (!only || l === only))
if (only && targets.length === 0) throw new Error(`Unknown locale "${only}"`)

const readJson = (path: string) => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {})
const writeJson = (path: string, value: unknown) =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)

const english = flatten(readJson(join(DIR, "en.json")))
const lock: Record<string, string> = readJson(LOCK)
const current = Object.fromEntries(
  [...english].map(([key, message]) => [key, hashMessage(message)]),
)

async function translateLocale(locale: Locale): Promise<number> {
  const existing = flatten(readJson(join(DIR, `${locale}.json`)))
  const overrides = flatten(readJson(join(DIR, "overrides", `${locale}.json`)))

  const todo = [...english.keys()].filter(
    (key) => !overrides.has(key) && (force || !existing.has(key) || lock[key] !== current[key]),
  )
  const prepared = new Map(todo.map((key) => [key, prepare(english.get(key)!)]))
  const segments = [...new Set([...prepared.values()].flatMap((p) => p.segments))]
  const chars = segments.reduce((sum, s) => sum + s.length, 0)
  console.log(`${locale}: ${todo.length} messages, ${segments.length} segments, ${chars} chars`)
  if (dryRun) return chars

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY
  if (!apiKey) throw new Error("GOOGLE_TRANSLATE_API_KEY is not set (environment or .env.local)")
  const translated = segments.length
    ? await translateHtml(segments, { apiKey, target: locale })
    : []
  const bySegment = new Map(segments.map((s, i) => [s, translated[i]]))

  const result: Flat = new Map()
  for (const key of english.keys()) {
    const override = overrides.get(key)
    if (override !== undefined) {
      if (!verify(english.get(key)!, override)) {
        console.warn(`  ! override ${key} doesn't use the English arguments`)
      }
      result.set(key, override)
      continue
    }
    const plan = prepared.get(key)
    if (!plan) {
      result.set(key, existing.get(key)!)
      continue
    }
    const message = rebuild(plan, bySegment, locale)
    if (verify(plan.source, message)) {
      result.set(key, message)
    } else {
      // A placeholder went missing in translation: keep English rather than ship a broken string.
      console.warn(`  ! ${key}: translation lost a placeholder, kept English (${message})`)
      result.set(key, plan.source)
    }
  }
  writeJson(join(DIR, `${locale}.json`), unflatten(result, english.keys()))
  return chars
}

async function main() {
  mkdirSync(join(DIR, "overrides"), { recursive: true })
  let total = 0
  for (const locale of targets) total += await translateLocale(locale)
  const cost = (total / 1_000_000) * USD_PER_MILLION_CHARS
  console.log(
    `${dryRun ? "Would send" : "Sent"} ${total} characters (≈ $${cost.toFixed(2)} past the free tier)`,
  )
  // The lock only moves forward when every locale was translated, so a partial run (--lang)
  // leaves the others marked as stale.
  if (!dryRun && !only) writeJson(LOCK, current)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
