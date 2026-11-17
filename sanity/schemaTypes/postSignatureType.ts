import { defineField, defineType } from "sanity"
import { SignatureIcon } from "../components/icons"

/**
 * A detached PGP signature over a post's Markdown (lib/post-markdown.ts), written by
 * `npm run sign` on Ashik's machine, where the secret key lives. `_id` is
 * `signature-<post id>`, so the site finds it without a query.
 *
 * Kept out of the post itself: writing it there would count as an edit, re-run translations
 * and change the post's revision. The site shows a signature only while `sha256` still matches
 * the post's current Markdown, so an edit after signing simply hides it until the next run.
 */
export const postSignatureType = defineType({
  name: "postSignature",
  title: "Post signature",
  type: "document",
  icon: SignatureIcon,
  readOnly: true,
  fields: [
    defineField({ name: "post", type: "reference", to: [{ type: "post" }], weak: true }),
    defineField({
      name: "sha256",
      title: "SHA-256 of the signed Markdown",
      type: "string",
    }),
    defineField({ name: "signature", title: "Armored detached signature", type: "text" }),
    defineField({ name: "fingerprint", title: "Signing key", type: "string" }),
    defineField({ name: "signedAt", type: "datetime" }),
  ],
  preview: {
    select: { title: "post.title", signedAt: "signedAt" },
    prepare: ({ title, signedAt }) => ({
      title: title || "Deleted post",
      subtitle: signedAt ? `Signed ${String(signedAt).slice(0, 10)}` : undefined,
    }),
  },
})
