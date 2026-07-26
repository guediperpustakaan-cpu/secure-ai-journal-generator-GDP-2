import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "ai_journal_session";
const SESSION_MINUTES = 30;
const PASSWORD_KEY_LENGTH = 64;

type PublicUser = {
  id: string;
  email: string;
  displayName: string;
};

function sessionExpiry(): Date {
  return new Date(Date.now() + SESSION_MINUTES * 60 * 1000);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const derived = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${derived.toString("base64url")}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [scheme, salt, hash] = storedHash.split("$");
  if (scheme !== "scrypt" || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "base64url");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function toPublicUser(user: typeof users.$inferSelect): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
  };
}

async function requestMetadata() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ipAddress: forwardedFor ?? headerStore.get("x-real-ip") ?? null,
    userAgent: headerStore.get("user-agent") ?? null,
  };
}

export async function registerUser(email: string, password: string, displayName: string): Promise<PublicUser> {
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    throw new Error("EMAIL_EXISTS");
  }

  const [created] = await db
    .insert(users)
    .values({
      email,
      displayName,
      passwordHash: await hashPassword(password),
    })
    .returning();

  if (!created) {
    throw new Error("CREATE_USER_FAILED");
  }

  return toPublicUser(created);
}

export async function authenticateUser(email: string, password: string): Promise<PublicUser | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    await scrypt(password, "missing-user-padding", PASSWORD_KEY_LENGTH);
    return null;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  return valid ? toPublicUser(user) : null;
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const metadata = await requestMetadata();

  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: sessionExpiry(),
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MINUTES * 60,
  });
}

export async function revokeCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.tokenHash, hashToken(token)));
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const [session] = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!session) {
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user) {
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  const nextExpiry = sessionExpiry();
  await db
    .update(sessions)
    .set({ lastSeenAt: new Date(), expiresAt: nextExpiry })
    .where(eq(sessions.id, session.id));

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MINUTES * 60,
  });

  return toPublicUser(user);
}

export async function requireUser(): Promise<PublicUser | Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }
  return user;
}

export type { PublicUser };
