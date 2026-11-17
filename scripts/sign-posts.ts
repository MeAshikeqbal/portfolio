/**
 * Signs each published post's Markdown (lib/post-markdown.ts, served at /post/<slug>.md) with
 * the PGP key in siteConfig.pgpFingerprint, and stores the detached signatures in Sanity as
 * `postSignature` documents, which /post/<slug>.md.asc serves.
 *
 *   npm run sign                    (scripts/sign-identity.ts, then this)
 *   npx sanity exec scripts/sign-posts.ts --with-user-token -- --dry-run
 *
 * Only posts whose Markdown changed since their last signature are signed again, and each new
 * signature is checked with `gpg --verify` before it's written. Runs on your machine: it needs
 * the secret key (gpg asks for the passphrase) and your Sanity login (--with-user-token).
 */
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { getCliClient } from "sanity/cli"
import {
  POST_SOURCE_PROJECTION,
  markdownDigest,
  postToMarkdown,
  type PostSource,
} from "../lib/post-markdown"
import { siteConfig } from "../lib/site"

const fingerprint = siteConfig.pgpFingerprint
const dryRun = process.argv.includes("--dry-run")
const client = getCliClient({ apiVersion: "2026-11-01", useCdn: false, perspective: "published" })
const { projectId, dataset } = client.config()
if (!projectId || !dataset) throw new Error("No Sanity project configured (sanity.cli.ts).")

type Row = PostSource & {
  _id: string
  signed: { sha256: string | null; fingerprint: string | null } | null
}

function gpg(args: string[], input?: string): string {
  return execFileSync("gpg", args, { input, encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] })
}

/** Detached, armored signature over the Markdown's bytes, verified before it's returned. */
function sign(markdown: string): string {
  const signature = gpg(
    ["--detach-sign", "--armor", "--digest-algo", "SHA512", "--local-user", `${fingerprint}!`],
    markdown,
  )
  const dir = mkdtempSync(path.join(tmpdir(), "sign-posts-"))
  try {
    writeFileSync(path.join(dir, "post.md"), markdown)
    writeFileSync(path.join(dir, "post.md.asc"), signature)
    // Throws on a bad signature; --status-fd shows which key made it.
    const status = execFileSync(
      "gpg",
      ["--status-fd", "1", "--verify", path.join(dir, "post.md.asc"), path.join(dir, "post.md")],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    )
    if (!new RegExp(`^\\[GNUPG:\\] VALIDSIG ${fingerprint}`, "m").test(status)) {
      throw new Error("gpg didn't report a valid signature from the site's key")
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  return signature
}

async function main() {
  const posts = await client.fetch<Row[]>(
    `*[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
      ${POST_SOURCE_PROJECTION},
      "signed": *[_type == "postSignature" && _id == "signature-" + ^._id][0] { sha256, fingerprint }
    }`,
  )

  const transaction = client.transaction()
  let signed = 0
  for (const post of posts) {
    const markdown = postToMarkdown(post, { projectId: projectId!, dataset: dataset! })
    const sha256 = markdownDigest(markdown)
    if (post.signed?.sha256 === sha256 && post.signed.fingerprint === fingerprint) {
      console.log(`  unchanged  ${post.slug}`)
      continue
    }
    console.log(
      `  ${dryRun ? "would sign" : "signing   "} ${post.slug}  (${markdown.length} bytes)`,
    )
    signed++
    if (dryRun) continue
    transaction.createOrReplace({
      _id: `signature-${post._id}`,
      _type: "postSignature",
      post: { _type: "reference", _ref: post._id, _weak: true },
      sha256,
      signature: sign(markdown),
      fingerprint,
      signedAt: new Date().toISOString(),
    })
  }

  // Signatures whose post was deleted or unpublished.
  const orphans = await client.fetch<string[]>(
    `*[_type == "postSignature" && !defined(post->_id)]._id`,
  )
  for (const id of orphans) {
    console.log(`  ${dryRun ? "would drop" : "dropping  "} ${id}`)
    if (!dryRun) transaction.delete(id)
  }

  if (!dryRun && (signed > 0 || orphans.length > 0)) await transaction.commit()
  console.log(
    `${signed} ${dryRun ? "to sign" : "signed"}, ${posts.length - signed} unchanged, ${orphans.length} dropped.`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
