#!/usr/bin/env node
/**
 * Exports the content and inbox datasets (documents and assets) into backups/, named by date.
 * backups/ is git-ignored: the inbox export holds personal data, so keep it off the repo.
 *
 *   npm run backup                  # both datasets
 *   npm run backup -- production    # just one
 *
 * Needs `npx sanity login` once.
 */
import { spawnSync } from "node:child_process"
import { mkdirSync } from "node:fs"

const datasets = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
      process.env.SANITY_INBOX_DATASET || "inbox",
    ]
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)

mkdirSync("backups", { recursive: true })
for (const dataset of datasets) {
  const file = `backups/${dataset}-${stamp}.tar.gz`
  console.log(`Exporting ${dataset} → ${file}`)
  const { status } = spawnSync("npx", ["sanity", "dataset", "export", dataset, file], {
    stdio: "inherit",
  })
  if (status !== 0) process.exit(status ?? 1)
}
