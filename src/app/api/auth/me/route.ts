import { getCurrentUser } from "@/lib/security/auth";
import { safeOk } from "@/lib/security/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  return safeOk({ user });
}
