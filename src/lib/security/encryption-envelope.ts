import type { JsonRecord } from "./validation";

type EncryptedEnvelope = {
  version: number;
  algorithm: "AES-GCM";
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
};

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

function isBase64(value: unknown, minLength: number, maxLength: number): value is string {
  return typeof value === "string" && value.length >= minLength && value.length <= maxLength && BASE64_RE.test(value);
}

export function parseEncryptedEnvelope(value: unknown): EncryptedEnvelope | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as JsonRecord;
  const envelope: EncryptedEnvelope = {
    version: record.version === 1 ? 1 : 0,
    algorithm: record.algorithm === "AES-GCM" ? "AES-GCM" : "AES-GCM",
    kdf: record.kdf === "PBKDF2-SHA256" ? "PBKDF2-SHA256" : "PBKDF2-SHA256",
    iterations: typeof record.iterations === "number" ? record.iterations : 0,
    salt: typeof record.salt === "string" ? record.salt : "",
    iv: typeof record.iv === "string" ? record.iv : "",
    ciphertext: typeof record.ciphertext === "string" ? record.ciphertext : "",
  };

  if (
    envelope.version !== 1 ||
    envelope.algorithm !== "AES-GCM" ||
    envelope.kdf !== "PBKDF2-SHA256" ||
    envelope.iterations < 150_000 ||
    envelope.iterations > 800_000 ||
    !isBase64(envelope.salt, 16, 128) ||
    !isBase64(envelope.iv, 12, 64) ||
    !isBase64(envelope.ciphertext, 16, 80_000)
  ) {
    return null;
  }

  return envelope;
}

export type { EncryptedEnvelope };
