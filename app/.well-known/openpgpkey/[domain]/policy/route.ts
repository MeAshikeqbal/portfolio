import { pgpKey } from "@/lib/pgp.generated"
import { wkdPolicyResponse } from "@/lib/wkd"

/** WKD, advanced layout: the domain's (empty) policy file (lib/wkd.ts). */
export async function GET(_request: Request, { params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params
  return wkdPolicyResponse({ domain }, pgpKey.email)
}
