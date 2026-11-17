import { signedSecurityTxt } from "@/lib/pgp.generated"

export const dynamic = "force-static"

/**
 * RFC 9116 security.txt, clearsigned with the site's PGP key (lib/security-txt.ts says what's
 * in it; `npm run sign` signs it and sets Expires a year out):
 *
 *   curl -sL itsashik.dev/.well-known/security.txt | gpg --verify
 */
export function GET() {
  // Until `npm run sign` has run there's nothing to publish: no file beats an unsigned one.
  if (!signedSecurityTxt) return new Response("Not found\n", { status: 404 })
  return new Response(signedSecurityTxt, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  })
}
