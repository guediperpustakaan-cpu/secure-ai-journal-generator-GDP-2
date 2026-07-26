import { aiRateLimits } from "@/db/schema";
import { db } from "@/db";
import { generateJournal, localJournal } from "@/lib/ai/journal-generator";
import { requireUser } from "@/lib/security/auth";
import { readJsonBody, safeError, safeOk, sanitizeMultiline, sanitizeText } from "@/lib/security/validation";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TEMPLATES = new Set(["Refleksi Harian", "Jurnal Syukur", "Jurnal Produktivitas"]);
const ALLOWED_MOODS = new Set(["Tenang", "Bahagia", "Lelah", "Cemas", "Termotivasi", "Sedih", "Campur Aduk"]);
const RATE_LIMIT = 8;
const WINDOW_MS = 10 * 60 * 1000;

async function enforceRateLimit(userId: string): Promise<boolean> {
  const windowStart = new Date(Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS);
  const [bucket] = await db
    .insert(aiRateLimits)
    .values({
      rateKey: `ai-generate:${userId}`,
      windowStart,
      requestCount: 1,
    })
    .onConflictDoUpdate({
      target: [aiRateLimits.rateKey, aiRateLimits.windowStart],
      set: {
        requestCount: sql`${aiRateLimits.requestCount} + 1`,
        updatedAt: new Date(),
      },
    })
    .returning({ requestCount: aiRateLimits.requestCount });

  return (bucket?.requestCount ?? RATE_LIMIT + 1) <= RATE_LIMIT;
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (user instanceof Response) {
    return user;
  }

  const body = await readJsonBody(request, 10_000);
  if (!body) {
    return safeError("Format permintaan tidak valid", 400);
  }

  const template = sanitizeText(body.template, 60);
  const mood = sanitizeText(body.mood, 60);
  const daySummary = sanitizeMultiline(body.daySummary, 1_200);
  const focus = sanitizeText(body.focus, 160);

  if (!ALLOWED_TEMPLATES.has(template) || !ALLOWED_MOODS.has(mood)) {
    return safeError("Pilihan template atau suasana hati tidak valid", 422);
  }

  if (daySummary.length < 3) {
    return safeError("Ceritakan hari Anda minimal beberapa kata", 422);
  }

  const allowed = await enforceRateLimit(user.id);
  if (!allowed) {
    return safeError("Batas pembuatan jurnal tercapai. Coba lagi dalam beberapa menit", 429);
  }

  try {
    const journal = await generateJournal({ template, mood, daySummary, focus });
    return safeOk({ journal });
  } catch {
    const fallback = localJournal({ template, mood, daySummary, focus });
    return safeOk({ journal: fallback });
  }
}
