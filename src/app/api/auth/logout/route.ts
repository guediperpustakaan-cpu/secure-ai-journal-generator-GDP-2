import { revokeCurrentSession } from "@/lib/security/auth";
import { safeOk } from "@/lib/security/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await revokeCurrentSession();
  return safeOk({ signedOut: true });
}
