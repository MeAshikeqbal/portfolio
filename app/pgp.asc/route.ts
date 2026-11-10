import { pgpKey } from "@/lib/pgp.generated"

export const dynamic = "force-static"

/** The public key the footer's identity statement is signed with: `curl … | gpg --import`. */
export function GET() {
  return new Response(pgpKey.publicKey, {
    // text/plain so a browser shows the key instead of downloading it.
    headers: { "content-type": "text/plain; charset=utf-8" },
  })
}
