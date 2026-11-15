/**
 * Project refresh (2026-11): rewrite titles, one-liners, tech, status and case studies for the
 * projects in scripts/projects-content.data.ts, add the new ones, set the display order, and
 * unpublish the retired ones (each is kept as a Studio draft, so "Publish" restores it).
 *
 *   npx sanity exec scripts/projects-content.ts --with-user-token                 # dry run
 *   npx sanity exec scripts/projects-content.ts --with-user-token -- --execute    # apply
 *   ... -- --show <slug>     # also print that project's case study as it will be stored
 *
 * Revision-aware like scripts/curation.ts: the dry run snapshots every touched document's
 * `_rev` and a hash of the plan in scripts/.projects-content.snapshot.json; --execute refuses if
 * anything changed since, and patches with `ifRevisionId`. Documents with an unpublished draft
 * are refused (the draft would keep the old copy and win in the Studio).
 */
import { createHash, randomBytes } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { getCliClient } from "sanity/cli"

import { FORBIDDEN_PATTERNS } from "./about-content.validate"
import { PROJECTS, UNPUBLISH, type ProjectCopy } from "./projects-content.data"

const DESCRIPTION_MAX = 80
/** Pattern labels a given project may match on purpose (its own public repo name). */
const ALLOWED_MATCHES: Record<string, string[]> = {
  "project-exsbe-theme": ["lab domain or org name"],
}

const execute = process.argv.includes("--execute")
const showIndex = process.argv.indexOf("--show")
const show = showIndex > -1 ? process.argv[showIndex + 1] : null
const SNAPSHOT = path.join(process.cwd(), "scripts/.projects-content.snapshot.json")
const client = getCliClient({ apiVersion: "2026-11-01", useCdn: false, perspective: "raw" })
const planHash = createHash("sha256").update(JSON.stringify({ PROJECTS, UNPUBLISH })).digest("hex")

/** LexoRank-style ranks below every existing one, ascending in PROJECTS order. */
const rank = (index: number) => `0|0000${String.fromCharCode(97 + index)}0:`
const key = () => randomBytes(6).toString("hex")

// ---------------------------------------------------------------------------------------------
// Markdown subset -> Portable Text

type Span = { _type: "span"; _key: string; text: string; marks: string[] }
type LinkDef = { _type: "link"; _key: string; href: string }
type Block = {
  _type: "block"
  _key: string
  style: string
  markDefs: LinkDef[]
  children: Span[]
  listItem?: "bullet"
  level?: number
}

/** Inline `code`, **strong** and [text](https://…) links. */
function inline(text: string): Pick<Block, "children" | "markDefs"> {
  const children: Span[] = []
  const markDefs: LinkDef[] = []
  for (const part of text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\(https:\/\/[^)\s]+\))/)) {
    if (!part) continue
    const link = part.match(/^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/)
    if (link) {
      const def: LinkDef = { _type: "link", _key: key(), href: link[2] }
      markDefs.push(def)
      children.push({ _type: "span", _key: key(), text: link[1], marks: [def._key] })
      continue
    }
    const marks = part.startsWith("`") ? ["code"] : part.startsWith("**") ? ["strong"] : []
    const clean =
      marks[0] === "code" ? part.slice(1, -1) : marks[0] === "strong" ? part.slice(2, -2) : part
    children.push({ _type: "span", _key: key(), text: clean, marks })
  }
  return { children, markDefs }
}

export function toPortableText(markdown: string): Block[] {
  const blocks: Block[] = []
  for (const chunk of markdown.trim().split(/\n\s*\n/)) {
    const lines = chunk.trim().split("\n")
    if (lines.every((l) => l.startsWith("- "))) {
      for (const line of lines) {
        blocks.push({
          _type: "block",
          _key: key(),
          style: "normal",
          listItem: "bullet",
          level: 1,
          ...inline(line.slice(2)),
        })
      }
      continue
    }
    const text = lines.join(" ")
    const heading = text.match(/^(#{2,4}) (.*)$/)
    blocks.push({
      _type: "block",
      _key: key(),
      style: heading ? `h${heading[1].length}` : "normal",
      ...inline(heading ? heading[2] : text),
    })
  }
  return blocks
}

// ---------------------------------------------------------------------------------------------
// Validation

function validate(): string[] {
  const problems: string[] = []
  const slugs = new Set<string>()
  for (const p of PROJECTS) {
    if (slugs.has(p.slug)) problems.push(`${p.title}: duplicate slug ${p.slug}`)
    slugs.add(p.slug)
    if (p.description.length > DESCRIPTION_MAX) {
      problems.push(
        `${p.title}: description is ${p.description.length} characters (max ${DESCRIPTION_MAX})`,
      )
    }
    if (p.github && !/^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(p.github)) {
      problems.push(`${p.title}: bad GitHub URL ${p.github}`)
    }
    if (p.github?.toLowerCase().includes("asteronix")) {
      problems.push(`${p.title}: links the company's GitHub org (owner asked not to name it)`)
    }
    const text = [p.title, p.description, p.body, ...p.tech].join("\n")
    for (const { label, pattern } of FORBIDDEN_PATTERNS) {
      if (ALLOWED_MATCHES[p._id]?.includes(label)) continue
      const match = text.match(pattern)
      if (match) problems.push(`${p.title}: ${label} ("${match[0]}")`)
    }
    if (/asteronix|innovative/i.test(text)) problems.push(`${p.title}: banned word`)
    const words = p.body.split(/\s+/).filter((w) => /\w/.test(w)).length
    if (words < 80 || words > 330) problems.push(`${p.title}: case study is ${words} words`)
  }
  return problems
}

// ---------------------------------------------------------------------------------------------

interface Doc {
  _id: string
  _rev: string
  _type: string
  title?: string
  slug?: { current?: string }
  [field: string]: unknown
}

const published = `!(_id in path("drafts.**")) && !(_id in path("versions.**"))`

function fields(p: ProjectCopy, index: number) {
  return {
    title: p.title,
    slug: { _type: "slug", current: p.slug },
    description: p.description,
    status: p.status,
    featured: p.featured,
    tech: p.tech,
    publishedAt: p.publishedAt,
    body: toPortableText(p.body),
    orderRank: rank(index),
  }
}

async function main() {
  console.log(execute ? "EXECUTING" : "DRY RUN (pass -- --execute to apply)")

  const problems = validate()
  if (problems.length > 0) {
    console.log("\nValidation failed:")
    for (const problem of problems) console.log(`  - ${problem}`)
    process.exit(1)
  }

  const ids = [...PROJECTS.map((p) => p._id), ...UNPUBLISH.map((u) => u._id)]
  const [docs, draftDocs, otherSlugs, refs] = await Promise.all([
    client.fetch<Doc[]>(`*[_id in $ids]`, { ids }),
    client.fetch<{ _id: string; _rev: string }[]>(`*[_id in $ids]{ _id, _rev }`, {
      ids: ids.map((id) => `drafts.${id}`),
    }),
    client.fetch<{ _id: string; slug: string }[]>(
      `*[_type == "project" && ${published} && !(_id in $ids)]{ _id, "slug": slug.current }`,
      { ids },
    ),
    client.fetch<{ _id: string; _type: string }[]>(`*[references($gone)]{ _id, _type }`, {
      gone: UNPUBLISH.map((u) => u._id),
    }),
  ])
  const byId = new Map(docs.map((d) => [d._id, d]))
  const drafts = draftDocs.map((d) => d._id)

  if (otherSlugs.length > 0) {
    console.log("\nOther published projects this plan doesn't touch (they stay as they are):")
    for (const o of otherSlugs) console.log(`  ${o._id} (${o.slug})`)
  }
  const clash = otherSlugs.filter((o) => PROJECTS.some((p) => p.slug === o.slug))
  if (clash.length > 0)
    throw new Error(`Slug already used by: ${clash.map((c) => c._id).join(", ")}`)

  console.log("\nProjects, in display order:")
  PROJECTS.forEach((p, i) => {
    const doc = byId.get(p._id)
    const action = doc ? "update" : "create"
    console.log(
      `\n${String(i + 1).padStart(2)}. [${action}] ${p.title}  /projects/${p.slug}` +
        `${p.featured ? "  ★ featured" : ""}  (${p.status})`,
    )
    if (doc && doc.title !== p.title) console.log(`    title:  ${doc.title} -> ${p.title}`)
    console.log(`    line:   ${p.description}  (${p.description.length})`)
    console.log(`    tech:   ${p.tech.join(" · ")}`)
    if (doc && (doc.url ?? null) !== p.url)
      console.log(`    url:    ${doc.url || "—"} -> ${p.url ?? "—"}`)
    else if (!doc) console.log(`    url:    ${p.url ?? "—"}`)
    console.log(`    github: ${p.github ?? "— (private or not linked)"}`)
    const words = p.body.split(/\s+/).filter((w) => /\w/.test(w)).length
    console.log(`    case study: ${words} words`)
    if (show === p.slug) console.log(`\n${p.body.trim().replace(/^/gm, "      ")}\n`)
  })

  console.log("\nUnpublish (kept as a Studio draft; Publish restores it):")
  for (const u of UNPUBLISH) {
    const doc = byId.get(u._id)
    if (!doc) throw new Error(`Not found: ${u._id} (${u.title})`)
    if (doc.title !== u.title) throw new Error(`${u._id} is "${doc.title}", expected "${u.title}"`)
    console.log(`  ${u.title}`)
  }
  if (refs.length > 0) {
    throw new Error(`Still referenced: ${refs.map((r) => `${r._type} ${r._id}`).join(", ")}`)
  }
  // A draft on a project this script creates is a stale skeleton (the published copy replaces
  // it, so it's discarded); a draft on any other touched document blocks the run.
  const created = new Set(PROJECTS.filter((p) => !byId.has(p._id)).map((p) => `drafts.${p._id}`))
  const stale = drafts.filter((id) => created.has(id))
  const blocking = drafts.filter((id) => !created.has(id))
  if (stale.length > 0)
    console.log(`\nDiscard stale drafts (replaced by the new published copy): ${stale.join(", ")}`)
  if (blocking.length > 0)
    console.log(`\nUnpublished drafts on ${blocking.join(", ")}: publish or discard them first.`)

  const revisions = Object.fromEntries([...docs, ...draftDocs].map((d) => [d._id, d._rev]))
  if (!execute) {
    writeFileSync(SNAPSHOT, `${JSON.stringify({ planHash, revisions }, null, 2)}\n`)
    console.log(`\nSnapshot written to ${path.relative(process.cwd(), SNAPSHOT)}.`)
    return
  }

  if (blocking.length > 0) throw new Error("Refusing: touched documents have unpublished drafts.")
  if (!existsSync(SNAPSHOT)) throw new Error("No snapshot: run the dry run first.")
  const snapshot = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as {
    planHash: string
    revisions: Record<string, string>
  }
  if (snapshot.planHash !== planHash) throw new Error("The plan changed: run the dry run again.")
  const changed = [
    ...new Set([...Object.keys(revisions), ...Object.keys(snapshot.revisions)]),
  ].filter((id) => snapshot.revisions[id] !== revisions[id])
  if (changed.length > 0) throw new Error(`Changed since the dry run: ${changed.join(", ")}.`)

  const tx = client.transaction()
  PROJECTS.forEach((p, i) => {
    const doc = byId.get(p._id)
    const set = fields(p, i)
    const optional = { url: p.url, github: p.github }
    if (doc) {
      const unset = Object.entries(optional)
        .filter(([, v]) => v === null)
        .map(([k]) => k)
      const present = Object.fromEntries(Object.entries(optional).filter(([, v]) => v !== null))
      tx.patch(p._id, (patch) => {
        let next = patch.ifRevisionId(doc._rev).set({ ...set, ...present })
        if (!p.github) unset.push("githubData", "githubSyncRequestedAt")
        if (unset.length > 0) next = next.unset(unset)
        return next
      })
    } else {
      const present = Object.fromEntries(Object.entries(optional).filter(([, v]) => v !== null))
      tx.create({ _id: p._id, _type: "project", ...set, ...present })
    }
  })
  for (const id of stale) tx.delete(id)
  for (const u of UNPUBLISH) {
    // Same content as a draft, minus the system fields Sanity sets itself.
    const content = Object.fromEntries(
      Object.entries(byId.get(u._id)!).filter(
        ([k]) => !["_rev", "_createdAt", "_updatedAt"].includes(k),
      ),
    )
    tx.createIfNotExists({ ...content, _id: `drafts.${u._id}`, _type: "project" })
    tx.delete(u._id)
  }
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
