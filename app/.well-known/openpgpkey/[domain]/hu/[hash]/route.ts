import { pgpKey } from "@/lib/pgp.generated"
import { wkdKeyResponse } from "@/lib/wkd"

type Params = { params: Promise<{ domain: string; hash: string }> }

/** WKD, advanced layout (on openpgpkey.<domain>): the key by domain and hash (lib/wkd.ts). */
export async function GET(_request: Request, { params }: Params) {
  const { domain, hash } = await params
  return wkdKeyResponse(pgpKey, { domain, hash })
}
