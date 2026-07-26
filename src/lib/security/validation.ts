const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
const ANGLE_BRACKETS = /[<>]/g;

export type JsonRecord = Record<string, unknown>;

export function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFKC")
    .replace(CONTROL_CHARS, " ")
    .replace(ANGLE_BRACKETS, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeMultiline(value: unknown, maxLength: number): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(ANGLE_BRACKETS, "")
    .trim()
    .slice(0, maxLength);
}

export function normalizeEmail(value: unknown): string {
  return sanitizeText(value, 320).toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320;
}

export function isStrongEnoughPassword(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 10 &&
    value.length <= 200 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value)
  );
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function readJsonBody(request: Request, maxBytes = 32_000): Promise<JsonRecord | null> {
  const length = request.headers.get("content-length");
  if (length && Number(length) > maxBytes) {
    return null;
  }

  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return null;
    }
    return body as JsonRecord;
  } catch {
    return null;
  }
}

export function safeError(message = "Permintaan tidak dapat diproses", status = 400): Response {
  return Response.json({ ok: false, error: message }, { status });
}

export function safeOk<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ ok: true, data }, init);
}
