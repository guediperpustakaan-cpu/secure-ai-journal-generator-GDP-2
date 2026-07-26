import { authenticateUser, createSession } from "@/lib/security/auth";
import { isValidEmail, normalizeEmail, readJsonBody, safeError, safeOk } from "@/lib/security/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJsonBody(request, 6_000);
  if (!body) {
    return safeError("Format permintaan tidak valid", 400);
  }

  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";

  if (!isValidEmail(email) || password.length < 1 || password.length > 200) {
    return safeError("Email atau password tidak sesuai", 401);
  }

  try {
    const user = await authenticateUser(email, password);
    if (!user) {
      return safeError("Email atau password tidak sesuai", 401);
    }

    await createSession(user.id);
    return safeOk({ user });
  } catch {
    return safeError("Login gagal. Coba lagi nanti", 500);
  }
}
