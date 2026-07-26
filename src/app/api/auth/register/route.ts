import { createSession, registerUser } from "@/lib/security/auth";
import { isStrongEnoughPassword, isValidEmail, normalizeEmail, readJsonBody, safeError, safeOk, sanitizeText } from "@/lib/security/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJsonBody(request, 8_000);
  if (!body) {
    return safeError("Format permintaan tidak valid", 400);
  }

  const email = normalizeEmail(body.email);
  const displayName = sanitizeText(body.displayName, 80) || "Pengguna Jurnal";
  const password = body.password;

  if (!isValidEmail(email)) {
    return safeError("Alamat email tidak valid", 422);
  }

  if (!isStrongEnoughPassword(password)) {
    return safeError("Password minimal 10 karakter dan memuat huruf besar, huruf kecil, serta angka", 422);
  }

  try {
    const user = await registerUser(email, password, displayName);
    await createSession(user.id);
    return safeOk({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_EXISTS") {
      return safeError("Email sudah terdaftar", 409);
    }
    return safeError("Registrasi gagal. Coba lagi nanti", 500);
  }
}
