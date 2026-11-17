import { pgpKey } from "@/lib/pgp.generated"
import { wkdKeyResponse } from "@/lib/wkd"

/** WKD, direct layout: the key for hello@<domain> by its hash (lib/wkd.ts). */
export async function GET(_request: Request, { params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params
  return wkdKeyResponse(pgpKey, { hash })
}
