import { signedIdentity } from "@/lib/pgp.generated"

export const dynamic = "force-static"

/** The footer's clearsigned identity statement: `curl … | gpg --verify`. */
export function GET() {
  return new Response(signedIdentity, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  })
}
