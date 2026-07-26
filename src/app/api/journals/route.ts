import { journals } from "@/db/schema";
import { parseEncryptedEnvelope } from "@/lib/security/encryption-envelope";
import { requireUser } from "@/lib/security/auth";
import { withUserRls } from "@/lib/security/rls";
import { readJsonBody, safeError, safeOk, sanitizeText } from "@/lib/security/validation";
import { desc, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TEMPLATES = new Set(["Refleksi Harian", "Jurnal Syukur", "Jurnal Produktivitas"]);

export async function GET() {
  const user = await requireUser();
  if (user instanceof Response) {
    return user;
  }

  try {
    const items = await withUserRls(user.id, async (tx) =>
      tx
        .select({
          id: journals.id,
          title: journals.title,
          template: journals.template,
          mood: journals.mood,
          encryptedContent: journals.encryptedContent,
          encryptionMeta: journals.encryptionMeta,
          createdAt: journals.createdAt,
          updatedAt: journals.updatedAt,
        })
        .from(journals)
        .where(eq(journals.ownerId, user.id))
        .orderBy(desc(journals.updatedAt))
        .limit(100),
    );

    return safeOk({ journals: items });
  } catch {
    return safeError("Jurnal tidak dapat dimuat", 500);
  }
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (user instanceof Response) {
    return user;
  }

  const body = await readJsonBody(request, 90_000);
  if (!body) {
    return safeError("Format permintaan tidak valid", 400);
  }

  const title = sanitizeText(body.title, 160) || "Jurnal Baru";
  const template = sanitizeText(body.template, 60);
  const mood = sanitizeText(body.mood, 60) || "Campur Aduk";
  const envelope = parseEncryptedEnvelope(body.encryptedContent);

  if (!ALLOWED_TEMPLATES.has(template)) {
    return safeError("Template tidak valid", 422);
  }

  if (!envelope) {
    return safeError("Konten harus dienkripsi di perangkat sebelum disimpan", 422);
  }

  try {
    const [created] = await withUserRls(user.id, async (tx) =>
      tx
        .insert(journals)
        .values({
          ownerId: user.id,
          title,
          template,
          mood,
          encryptedContent: JSON.stringify(envelope),
          encryptionMeta: {
            version: envelope.version,
            algorithm: envelope.algorithm,
            kdf: envelope.kdf,
          },
        })
        .returning({
          id: journals.id,
          title: journals.title,
          template: journals.template,
          mood: journals.mood,
          encryptedContent: journals.encryptedContent,
          encryptionMeta: journals.encryptionMeta,
          createdAt: journals.createdAt,
          updatedAt: journals.updatedAt,
        }),
    );

    return safeOk({ journal: created }, { status: 201 });
  } catch {
    return safeError("Jurnal gagal disimpan", 500);
  }
}
