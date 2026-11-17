import { pgpKey } from "@/lib/pgp.generated"
import { wkdPolicyResponse } from "@/lib/wkd"

export const dynamic = "force-static"

/** WKD, direct layout: an empty policy file says this domain serves keys (lib/wkd.ts). */
export function GET() {
  return wkdPolicyResponse({}, pgpKey.email)
}
