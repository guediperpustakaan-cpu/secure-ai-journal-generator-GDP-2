import { journals } from "@/db/schema";
import { parseEncryptedEnvelope } from "@/lib/security/encryption-envelope";
import { requireUser } from "@/lib/security/auth";
import { withUserRls } from "@/lib/security/rls";
import { isUuid, readJsonBody, safeError, safeOk, sanitizeText } from "@/lib/security/validation";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TEMPLATES = new Set(["Refleksi Harian", "Jurnal Syukur", "Jurnal Produktivitas"]);

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireUser();
  if (user instanceof Response) {
    return user;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return safeError("ID jurnal tidak valid", 400);
  }

  try {
    const [journal] = await withUserRls(user.id, async (tx) =>
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
        .where(and(eq(journals.id, id), eq(journals.ownerId, user.id)))
        .limit(1),
    );

    if (!journal) {
      return safeError("Jurnal tidak ditemukan", 404);
    }

    return safeOk({ journal });
  } catch {
    return safeError("Jurnal tidak dapat dimuat", 500);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const user = await requireUser();
  if (user instanceof Response) {
    return user;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return safeError("ID jurnal tidak valid", 400);
  }

  const body = await readJsonBody(request, 90_000);
  if (!body) {
    return safeError("Format permintaan tidak valid", 400);
  }

  const title = sanitizeText(body.title, 160) || "Jurnal Tanpa Judul";
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
    const [updated] = await withUserRls(user.id, async (tx) =>
      tx
        .update(journals)
        .set({
          title,
          template,
          mood,
          encryptedContent: JSON.stringify(envelope),
          encryptionMeta: {
            version: envelope.version,
            algorithm: envelope.algorithm,
            kdf: envelope.kdf,
          },
          updatedAt: new Date(),
        })
        .where(and(eq(journals.id, id), eq(journals.ownerId, user.id)))
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

    if (!updated) {
      return safeError("Jurnal tidak ditemukan", 404);
    }

    return safeOk({ journal: updated });
  } catch {
    return safeError("Jurnal gagal diperbarui", 500);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await requireUser();
  if (user instanceof Response) {
    return user;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return safeError("ID jurnal tidak valid", 400);
  }

  try {
    const [deleted] = await withUserRls(user.id, async (tx) =>
      tx
        .delete(journals)
        .where(and(eq(journals.id, id), eq(journals.ownerId, user.id)))
        .returning({ id: journals.id }),
    );

    if (!deleted) {
      return safeError("Jurnal tidak ditemukan", 404);
    }

    return safeOk({ deleted: true });
  } catch {
    return safeError("Jurnal gagal dihapus", 500);
  }
}
