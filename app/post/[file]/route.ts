import { getPostSlugs, getPostSource } from "@/lib/api"
import { absoluteUrl } from "@/lib/site"

/**
 * /post/<slug>.md, a post's English original as Markdown, and /post/<slug>.md.asc, the
 * detached PGP signature over those exact bytes:
 *
 *   curl -sO https://itsashik.dev/post/<slug>.md -O https://itsashik.dev/post/<slug>.md.asc
 *   gpg --verify <slug>.md.asc <slug>.md
 *
 * Files, so they sit outside the locale routing (proxy.ts skips paths with a dot). Prerendered
 * and refreshed with the post; the signature 404s while the post has changed since signing.
 */
export const dynamic = "force-static"

type Params = { params: Promise<{ file: string }> }

export async function generateStaticParams() {
  const slugs = await getPostSlugs()
  return slugs.flatMap((slug) => [{ file: `${slug}.md` }, { file: `${slug}.md.asc` }])
}

export async function GET(_request: Request, { params }: Params) {
  const { file } = await params
  const match = file.match(/^(.+)\.md(\.asc)?$/)
  if (!match) return notFound()
  const [, slug, asc] = match

  const source = await getPostSource(slug)
  if (!source) return notFound()
  const canonical = absoluteUrl(`/post/${slug}`)
  // The Markdown copy is for readers, tools and signature checks; the page stays the one
  // search engines index.
  const headers = {
    "x-robots-tag": "noindex",
    link: `<${canonical}>; rel="canonical"`,
  }

  if (asc) {
    if (!source.signature) return notFound()
    return new Response(source.signature.armored, {
      headers: { ...headers, "content-type": "text/plain; charset=utf-8" },
    })
  }
  return new Response(source.markdown, {
    headers: { ...headers, "content-type": "text/markdown; charset=utf-8" },
  })
}

function notFound() {
  return new Response("Not found\n", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  })
}
